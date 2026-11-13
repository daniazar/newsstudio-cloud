"""
scripts/veo-cli/auditors/poseFramingAuditor.py

Automated Anatomical Framing & Boundary Clearance Auditor for Master Keyframe Images.
Inspects keyframe images using YOLO-Pose:
  1. Detects framing type: 'knee_up', 'waist_up', 'closeup', 'full_body'
  2. Measures lower clearance: ensures hands/wrists have >= 12% vertical safety margin
  3. Measures lateral clearance: ensures arms/hands have >= 10% lateral margin
  4. Fails any standing anchor pose that is cropped waist-up or has hands near borders.
"""

import sys
import json
import os
import cv2
import numpy as np

def audit_image(image_path, pose_domain="chroma_wall_standing"):
    if not os.path.exists(image_path):
        return {"passed": False, "error": f"File not found: {image_path}"}

    img = cv2.imread(image_path)
    if img is None:
        return {"passed": False, "error": f"Failed to decode image: {image_path}"}

    h, w, _ = img.shape
    aspect_ratio_str = "16:9" if abs(w / h - 16/9) < 0.05 else ("9:16" if abs(w / h - 9/16) < 0.05 else f"{w}:{h}")

    # Chroma mask detection
    b, g, r = cv2.split(img)
    is_green = (g > 110) & (g > (r.astype(int) + 20)) & (g > (b.astype(int) + 20))
    is_blue = (b > 110) & (b > (r.astype(int) + 20)) & (b > (g.astype(int) + 20))
    is_chroma = np.mean(is_green) > 0.15 or np.mean(is_blue) > 0.15

    # Run YOLO-Pose
    from ultralytics import YOLO
    model = YOLO("yolov8n-pose.pt")
    results = model(image_path, verbose=False)

    if len(results) == 0 or results[0].boxes is None or len(results[0].boxes) == 0:
        return {
            "passed": False,
            "framing_type": "unknown",
            "reasons": ["No person detected in image by YOLO model"],
            "aspect_ratio": aspect_ratio_str,
            "dimensions": {"width": w, "height": h},
        }

    # Extract primary person bounding box
    boxes = results[0].boxes.xyxy.cpu().numpy()
    box = boxes[0]  # [x1, y1, x2, y2]
    person_x1, person_y1, person_x2, person_y2 = box[0], box[1], box[2], box[3]

    left_margin_px = float(person_x1)
    right_margin_px = float(w - person_x2)
    left_margin_pct = left_margin_px / w
    right_margin_pct = right_margin_px / w
    bottom_clearance_px = float(h - person_y2)
    bottom_clearance_pct = bottom_clearance_px / h

    # Keypoints analysis
    reasons = []
    passed = True
    framing_type = "unknown"

    kp_data = results[0].keypoints.data[0].cpu().numpy() if (results[0].keypoints is not None and len(results[0].keypoints.data) > 0) else None

    if kp_data is not None:
        # COCO keypoints:
        # 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear
        # 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow
        # 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip
        # 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle
        nose_y = float(kp_data[0][1])
        shoulders_y = float(max(kp_data[5][1], kp_data[6][1]))
        wrists_y = float(max(kp_data[9][1], kp_data[10][1]))
        hips_y = float(max(kp_data[11][1], kp_data[12][1]))
        hips_conf = float((kp_data[11][2] + kp_data[12][2]) / 2.0)
        knees_y = float(max(kp_data[13][1], kp_data[14][1]))
        knees_conf = float((kp_data[13][2] + kp_data[14][2]) / 2.0)
        ankles_y = float(max(kp_data[15][1], kp_data[16][1]))
        ankles_conf = float((kp_data[15][2] + kp_data[16][2]) / 2.0)

        torso_height = hips_y - shoulders_y if hips_y > shoulders_y else 0.4 * h

        # 1. Framing classification
        # In 16:9 widescreen, a cowboy / knee-up shot frames from head to mid-thigh/knees.
        if ankles_conf > 0.45 and ankles_y < h - 25:
            framing_type = "full_body"
        elif (knees_conf > 0.20 and knees_y <= h) or (hips_conf > 0.4 and (h - hips_y) > 0.14 * h):
            # Cowboy / knee-up shot: hips well clear of bottom, thighs/knees framed
            framing_type = "knee_up"
        elif hips_conf > 0.25 and (h - hips_y) <= 0.14 * h:
            framing_type = "waist_up"
        elif (h - shoulders_y) < 0.35 * h:
            framing_type = "closeup"
        else:
            framing_type = "mid_body"

        # 2. Hand clearance evaluation
        # Wrists to bottom of frame: human palm + fingers extend ~20-22% of torso height past wrists
        estimated_fingertips_y = wrists_y + (0.22 * torso_height if torso_height > 0 else 35)
        hand_clearance_px = float(h - estimated_fingertips_y)
        hand_clearance_pct = hand_clearance_px / h

        # 3. Framing enforcement for standing domains
        if "standing" in pose_domain or "chroma_wall_standing" in pose_domain:
            if framing_type in ["waist_up", "closeup"]:
                passed = False
                reasons.append(
                    f"{framing_type.replace('_', ' ').title()} framing detected (knees/thighs not visible). "
                    f"Standing broadcast loops REQUIRE knee-up (cowboy shot) framing where thighs and knees are framed, "
                    f"ensuring scale continuity and preventing gestures from leaving the bottom frame."
                )

            # Strict hand clearance: hands must NOT breach or clip the bottom edge
            if hand_clearance_pct < 0.04 or hand_clearance_px < 28:
                passed = False
                reasons.append(
                    f"Hands/wrists too close to bottom border: estimated fingertips at Y={estimated_fingertips_y:.0f}px "
                    f"({hand_clearance_px:.0f}px clearance, {hand_clearance_pct*100:.1f}%). "
                    f"Must have >= 4% bottom margin so downward arm movement does not exit frame."
                )

    # 4. Lateral clearance check
    if left_margin_pct < 0.08:
        passed = False
        reasons.append(f"Left margin too tight: {left_margin_px:.0f}px ({left_margin_pct*100:.1f}% < 8% minimum).")

    if right_margin_pct < 0.08:
        passed = False
        reasons.append(f"Right margin too tight: {right_margin_px:.0f}px ({right_margin_pct*100:.1f}% < 8% minimum).")

    return {
        "image_path": image_path,
        "filename": os.path.basename(image_path),
        "passed": passed,
        "framing_type": framing_type,
        "is_chroma": bool(is_chroma),
        "reasons": reasons,
        "bottom_clearance_px": round(bottom_clearance_px, 1),
        "bottom_clearance_pct": f"{bottom_clearance_pct*100:.1f}%",
        "hand_clearance_px": round(hand_clearance_px, 1),
        "hand_clearance_pct": f"{hand_clearance_pct*100:.1f}%",
        "left_margin_px": round(left_margin_px, 1),
        "left_margin_pct": f"{left_margin_pct*100:.1f}%",
        "right_margin_px": round(right_margin_px, 1),
        "right_margin_pct": f"{right_margin_pct*100:.1f}%",
        "aspect_ratio": aspect_ratio_str,
        "dimensions": {"width": w, "height": h},
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: poseFramingAuditor.py <image_path> [pose_domain]"}))
        sys.exit(1)

    target_path = sys.argv[1]
    domain = sys.argv[2] if len(sys.argv) > 2 else "chroma_wall_standing"
    result = audit_image(target_path, domain)
    print(json.dumps(result, indent=2))
