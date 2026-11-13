"""
scripts/veo-cli/auditors/setConsistencyAuditor.py

Automated Multi-Modal Persona-Agnostic Set Consistency Auditor.
Verifies identity, facial continuity, anatomical curvature (BWH / 90-60-90 / bust volume),
attire geometry (jacket length ratio), waistband construction (belt loops),
choker presence, and exposed midriff navel/bellybutton integrity across image sets.

Usage:
  python scripts/veo-cli/auditors/setConsistencyAuditor.py --dir <dir_path> [--baseline <path>] [--persona-reference <path>] [--json]
"""

import os
import sys
import json
import glob
import argparse
import cv2
import numpy as np

# Configure UTF-8 on Windows console to prevent charmap emoji encoding errors
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 1. Initialize YOLOv8-pose
try:
    from ultralytics import YOLO
    yolo_model = YOLO('yolov8n-pose.pt')
except Exception as e:
    sys.stderr.write(f'Warning: YOLO init failed: {e}\n')
    yolo_model = None

# 2. Initialize InsightFace FaceAnalysis
try:
    import insightface
    from insightface.app import FaceAnalysis
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=-1, det_size=(640, 640))
except Exception as e:
    sys.stderr.write(f'Warning: InsightFace init failed: {e}\n')
    face_app = None

def get_person_mask(img):
    """Extract person foreground binary mask (chroma removal or Otsu)"""
    h, w = img.shape[:2]
    b, g, r = cv2.split(img)
    is_green = (g > 110) & (g > (r.astype(int) + 20)) & (g > (b.astype(int) + 20))
    is_blue = (b > 110) & (b > (r.astype(int) + 20)) & (b > (g.astype(int) + 20))
    if np.mean(is_green) > 0.10:
        mask = (~is_green).astype(np.uint8) * 255
    elif np.mean(is_blue) > 0.10:
        mask = (~is_blue).astype(np.uint8) * 255
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    return mask

def detect_skin_pixels(img):
    """Detect skin pixels using HSV and YCrCb bounds"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    
    # HSV skin range
    lower_hsv = np.array([0, 20, 50], dtype=np.uint8)
    upper_hsv = np.array([25, 200, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)
    
    # YCrCb skin range
    lower_ycrcb = np.array([0, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)
    
    skin_mask = cv2.bitwise_and(mask_hsv, mask_ycrcb)
    return skin_mask

def analyze_single_image(image_path):
    if not os.path.exists(image_path):
        return {'valid': False, 'error': f'File not found: {image_path}'}
    
    img = cv2.imread(image_path)
    if img is None:
        return {'valid': False, 'error': f'Failed to decode: {image_path}'}
        
    h, w = img.shape[:2]
    
    # A. Face Analysis (InsightFace)
    face_data = {
        'detected': False,
        'embedding': None,
        'bbox': None,
        'landmarks': None,
        'hair_mean_lab': None,
        'gender': 'auto',
        'sex': 'unknown',
        'age': 30
    }
    if face_app is not None:
        try:
            faces = face_app.get(img)
            if len(faces) > 0:
                f = faces[0]
                face_data['detected'] = True
                face_data['embedding'] = (f.embedding / np.linalg.norm(f.embedding)).tolist()
                face_data['bbox'] = [float(x) for x in f.bbox]
                
                # Gender and age extraction
                sex_val = getattr(f, 'sex', None)
                if sex_val in ['M', 'F']:
                    face_data['sex'] = sex_val
                    face_data['gender'] = 'male' if sex_val == 'M' else 'female'
                else:
                    g_num = getattr(f, 'gender', None)
                    face_data['gender'] = 'male' if g_num == 1 else ('female' if g_num == 0 else 'female')
                    face_data['sex'] = 'M' if face_data['gender'] == 'male' else 'F'
                face_data['age'] = int(getattr(f, 'age', 30))
                
                # Hair color sampling (above forehead)
                fx1, fy1, fx2, fy2 = f.bbox
                hair_y1 = int(max(0, fy1 - 0.4 * (fy2 - fy1)))
                hair_y2 = int(max(0, fy1 + 0.1 * (fy2 - fy1)))
                hair_x1 = int(max(0, fx1 - 0.15 * (fx2 - fx1)))
                hair_x2 = int(min(w, fx2 + 0.15 * (fx2 - fx1)))
                if hair_y2 > hair_y1 and hair_x2 > hair_x1:
                    hair_crop = img[hair_y1:hair_y2, hair_x1:hair_x2]
                    lab = cv2.cvtColor(hair_crop, cv2.COLOR_BGR2LAB)
                    face_data['hair_mean_lab'] = np.mean(lab, axis=(0, 1)).tolist()
        except Exception as e:
            sys.stderr.write(f'Face extraction error on {image_path}: {e}\n')

    # B. YOLO Pose Keypoints
    pose_data = {
        'detected': False,
        'sh_y': 0.0,
        'hip_y': 0.0,
        'torso_len': 0.0,
        'center_x': w / 2.0,
        'sh_w': 0.0,
        'framing': 'unknown',
        'bottom_clearance_px': 0.0,
        'hands_in_front_midriff': False
    }
    if yolo_model is not None:
        try:
            res = yolo_model(image_path, verbose=False)
            if len(res) > 0 and res[0].keypoints is not None and len(res[0].keypoints.data) > 0:
                kp = res[0].keypoints.data[0].cpu().numpy()
                l_sh, r_sh = kp[5], kp[6]
                l_hip, r_hip = kp[11], kp[12]
                l_knee, r_knee = kp[13], kp[14]
                l_wrist, r_wrist = kp[9], kp[10]
                wrists_y = float(max(l_wrist[1], r_wrist[1]))
                
                sh_y = float((l_sh[1] + r_sh[1]) / 2.0)
                hip_y = float((l_hip[1] + r_hip[1]) / 2.0)
                torso_len = hip_y - sh_y
                center_x = float((l_sh[0] + r_sh[0]) / 2.0)
                sh_w = float(abs(l_sh[0] - r_sh[0]))
                
                knee_y = float(max(l_knee[1], r_knee[1]))
                knee_conf = float((l_knee[2] + r_knee[2]) / 2.0)
                
                framing = 'knee_up' if (knee_conf > 0.35 and knee_y < h - 15) else ('waist_up' if (h - hip_y) < 0.28 * h else 'mid_body')
                hand_clearance = float(h - wrists_y)
                
                # Check if hands are clasped/resting in front of the midriff
                # Midriff vertical zone is between sh_y + 0.5*t_len and hip_y
                mid_y1 = sh_y + 0.45 * torso_len
                mid_y2 = hip_y + 0.05 * torso_len
                hands_in_midriff = (
                    (mid_y1 <= l_wrist[1] <= mid_y2 and abs(l_wrist[0] - center_x) < 0.35 * sh_w) or
                    (mid_y1 <= r_wrist[1] <= mid_y2 and abs(r_wrist[0] - center_x) < 0.35 * sh_w)
                )
                
                pose_data = {
                    'detected': True,
                    'sh_y': sh_y,
                    'hip_y': hip_y,
                    'torso_len': torso_len,
                    'center_x': center_x,
                    'sh_w': sh_w,
                    'framing': framing,
                    'bottom_clearance_px': hand_clearance,
                    'hands_in_front_midriff': hands_in_midriff,
                    'keypoints': kp.tolist()
                }
        except Exception as e:
            sys.stderr.write(f'YOLO error on {image_path}: {e}\n')

    # C. Silhouette & Hourglass / Curvature Analysis (BWH 90-60-90 / 34DD)
    silhouette_data = {
        'bust_w': 0.0,
        'waist_w': 0.0,
        'hip_w': 0.0,
        'bust_to_waist_ratio': 0.0,
        'hip_to_waist_ratio': 0.0
    }
    mask = get_person_mask(img)
    if pose_data['detected'] and pose_data['torso_len'] > 40:
        sh_y = int(pose_data['sh_y'])
        hip_y = int(pose_data['hip_y'])
        cx = int(pose_data['center_x'])
        sh_w = pose_data['sh_w']
        
        # Clamp horizontal search to torso corridor (+/- 0.65 * sh_w from center)
        # to ensure outstretched or gesturing arms outside the torso do NOT inflate width!
        x_min = int(max(0, cx - 0.65 * sh_w))
        x_max = int(min(w, cx + 0.65 * sh_w))
        
        widths = []
        for y in range(sh_y, hip_y):
            row = mask[y, x_min:x_max]
            nz = np.where(row > 0)[0]
            if len(nz) > 0:
                widths.append((y, nz[-1] - nz[0]))
            else:
                widths.append((y, 0))
                
        if len(widths) > 10:
            bust_idx = int(0.32 * len(widths))
            bust_w = float(np.mean([w_val for _, w_val in widths[max(0, bust_idx-4):min(len(widths), bust_idx+4)]]))
            
            waist_zone = [w_val for _, w_val in widths[int(0.50*len(widths)):int(0.75*len(widths))] if w_val > 0]
            waist_w = float(min(waist_zone)) if len(waist_zone) > 0 else bust_w * 0.75
            
            hip_idx = int(0.92 * len(widths))
            hip_w = float(np.mean([w_val for _, w_val in widths[max(0, hip_idx-4):min(len(widths), hip_idx+4)]]))
            
            b_w_ratio = bust_w / waist_w if waist_w > 0 else 1.0
            h_w_ratio = hip_w / waist_w if waist_w > 0 else 1.0
            silhouette_data = {
                'bust_w': bust_w,
                'waist_w': waist_w,
                'hip_w': hip_w,
                'bust_to_waist_ratio': b_w_ratio,
                'hip_to_waist_ratio': h_w_ratio
            }

    # D. Attire Geometry & Waistband / Hem Analysis
    attire_data = {
        'jacket_hem_y': 0.0,
        'jacket_ratio': 0.0,
        'waistband_y': 0.0,
        'waistband_ratio': 0.0,
        'is_tucked': False,
        'exposed_midriff_gap': 0.0,
        'has_exposed_midriff': False,
        'navel_detected': False,
        'navel_status': 'none',
        'navel_coords': None,
        'belt_loops_detected': False,
        'belt_loop_edge_count': 0,
        'choker_detected': False,
        'dominant_top_rgb': [0, 0, 0],
        'dominant_pants_rgb': [0, 0, 0],
        'dominant_jacket_rgb': [0, 0, 0]
    }
    
    if pose_data['detected'] and pose_data['torso_len'] > 40:
        sh_y = int(pose_data['sh_y'])
        hip_y = int(pose_data['hip_y'])
        t_len = pose_data['torso_len']
        cx = int(pose_data['center_x'])
        sh_w = pose_data['sh_w']
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Swatches for Top and Pants
        top_y1 = int(sh_y + 0.20 * t_len)
        top_y2 = int(sh_y + 0.45 * t_len)
        top_x1 = max(0, int(cx - 0.25 * sh_w))
        top_x2 = min(w, int(cx - 0.08 * sh_w))
        top_swatch = img[top_y1:top_y2, top_x1:top_x2]
        if top_swatch.size == 0:
            top_swatch = img[top_y1:top_y2, max(0, int(cx + 0.08 * sh_w)):min(w, int(cx + 0.25 * sh_w))]
        top_rgb = [int(x) for x in np.mean(top_swatch, axis=(0, 1))[::-1]] if top_swatch.size > 0 else [180, 180, 180]
        
        pants_y1 = int(hip_y + 0.10 * t_len)
        pants_y2 = min(h, int(hip_y + 0.35 * t_len))
        pants_x1 = max(0, int(cx - 0.15 * sh_w))
        pants_x2 = min(w, int(cx + 0.15 * sh_w))
        pants_swatch = img[pants_y1:pants_y2, pants_x1:pants_x2]
        pants_rgb = [int(x) for x in np.mean(pants_swatch, axis=(0, 1))[::-1]] if pants_swatch.size > 0 else [40, 40, 40]
        
        # 2. Robust dual-flank waistband detection
        x1 = int(max(0, cx - 0.25 * sh_w))
        x2 = int(min(w - 1, cx + 0.25 * sh_w))
        y_start = int(sh_y)
        y_end = int(min(h, hip_y + 0.15 * t_len))
        strip1 = gray[y_start:y_end, max(0, x1 - 10):min(w, x1 + 10)]
        strip2 = gray[y_start:y_end, max(0, x2 - 10):min(w, x2 + 10)]
        
        if strip1.size > 0 and strip2.size > 0:
            flank_prof = (np.mean(strip1, axis=1) + np.mean(strip2, axis=1)) / 2.0
        elif strip1.size > 0:
            flank_prof = np.mean(strip1, axis=1)
        elif strip2.size > 0:
            flank_prof = np.mean(strip2, axis=1)
        else:
            flank_prof = np.mean(gray[y_start:y_end, cx:cx+1], axis=1)
            
        w_start = int(0.68 * t_len)
        w_end = int(min(len(flank_prof), 0.95 * t_len))
        waistband_y = float(sh_y + 0.78 * t_len)
        waistband_ratio = 0.78
        if w_end > w_start + 10:
            drop = flank_prof[w_start:w_end-6] - flank_prof[w_start+6:w_end]
            if len(drop) > 0 and np.max(drop) > 15:
                wb_idx = w_start + int(np.argmax(drop))
                waistband_y = float(sh_y + wb_idx)
                waistband_ratio = wb_idx / t_len
                
        # 3. Outer Garment / Jacket Hem vs Tucked Garment
        color_diff = float(np.linalg.norm(np.array(top_rgb) - np.array(pants_rgb)))
        is_tucked = (waistband_ratio >= 0.68) and (color_diff > 25)
        
        if is_tucked:
            jacket_hem_y = waistband_y
            jacket_ratio = waistband_ratio
        else:
            # Untucked jacket or cropped top: search Sobel edges
            sobel_y = np.abs(cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3))
            search_start = int(0.50 * t_len)
            search_end = int(0.75 * t_len)
            avg_edge = (sobel_y[sh_y + search_start:sh_y + search_end, x1] + sobel_y[sh_y + search_start:sh_y + search_end, x2]) / 2.0
            best_hem_rel = search_start + int(np.argmax(avg_edge)) if len(avg_edge) > 0 else int(0.61 * t_len)
            jacket_hem_y = float(sh_y + best_hem_rel)
            jacket_ratio = (jacket_hem_y - sh_y) / t_len if t_len > 0 else 0.61
            
        # 4. Exposed midriff & navel
        skin_mask = detect_skin_pixels(img)
        midriff_y1 = int(jacket_hem_y)
        midriff_y2 = int(waistband_y)
        exposed_gap = max(0.0, float(midriff_y2 - midriff_y1))
        
        has_exposed_midriff = False
        navel_detected = False
        navel_coords = None
        navel_status = 'no_exposed_midriff'
        
        # Midriff can only exist on untucked tops with positive skin gap; male clothed attire never has crop-top midriff
        if not is_tucked and exposed_gap >= 22.0 and face_data.get('gender') != 'male':
            midriff_skin = skin_mask[midriff_y1:midriff_y2, max(0, cx - 40):min(w, cx + 40)]
            skin_ratio = np.mean(midriff_skin > 0)
            if skin_ratio > 0.25:
                has_exposed_midriff = True
                
                # If hands are clasped in front of midriff, navel is naturally occluded
                if pose_data.get('hands_in_front_midriff', False):
                    navel_detected = True
                    navel_status = 'occluded_by_hands'
                else:
                    # Scan for navel in midriff lower zone
                    nav_search_y1 = int(midriff_y1 + 0.25 * exposed_gap)
                    nav_search_y2 = int(midriff_y2 - 2)
                    nav_search_x1 = max(0, cx - 25)
                    nav_search_x2 = min(w, cx + 25)
                    
                    midriff_crop_gray = gray[nav_search_y1:nav_search_y2, nav_search_x1:nav_search_x2]
                    if midriff_crop_gray.size > 30:
                        blur = cv2.GaussianBlur(midriff_crop_gray, (5, 5), 0)
                        min_val, max_val, min_loc, _ = cv2.minMaxLoc(blur)
                        local_contrast = max_val - min_val
                        if local_contrast > 20:
                            _, dark_thresh = cv2.threshold(blur, int(min_val + 0.35 * local_contrast), 255, cv2.THRESH_BINARY_INV)
                            contours, _ = cv2.findContours(dark_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                            for cnt in contours:
                                area = cv2.contourArea(cnt)
                                if 4 <= area <= 220:
                                    navel_detected = True
                                    navel_coords = [nav_search_x1 + min_loc[0], nav_search_y1 + min_loc[1]]
                                    navel_status = 'detected'
                                    break
                    if not navel_detected:
                        navel_status = 'missing'
                        
        # 5. Belt loop detection
        wb_y = int(waistband_y)
        wb_strip = gray[max(0, wb_y - 14):min(h, wb_y + 14), max(0, cx - int(0.35*sh_w)):min(w, cx + int(0.35*sh_w))]
        peaks = 0
        if wb_strip.size > 0:
            sobel_x = cv2.Sobel(wb_strip, cv2.CV_64F, 1, 0, ksize=3)
            vert_energy = np.abs(sobel_x)
            col_energy = np.mean(vert_energy, axis=0)
            if len(col_energy) > 10:
                mean_e = np.mean(col_energy)
                std_e = np.std(col_energy)
                thresh = mean_e + 1.1 * std_e
                peaks = int(np.sum((col_energy[1:-1] > thresh) & (col_energy[1:-1] > col_energy[:-2]) & (col_energy[1:-1] > col_energy[2:])))
        belt_loops = peaks >= 2
        
        # 6. Choker detection (strictly female snug choker, not shirt collars)
        neck_y1 = int(max(0, sh_y - 0.25 * t_len))
        neck_y2 = int(sh_y - 0.05 * t_len)
        choker_detected = False
        if face_data.get('gender') != 'male' and neck_y2 > neck_y1:
            neck_strip = gray[neck_y1:neck_y2, max(0, cx - int(0.18*sh_w)):min(w, cx + int(0.18*sh_w))]
            if neck_strip.size > 0:
                neck_sobel = cv2.Sobel(neck_strip, cv2.CV_64F, 0, 1, ksize=3)
                mean_grad = np.mean(np.abs(neck_sobel))
                choker_detected = mean_grad > 24.0
                
        attire_data = {
            'jacket_hem_y': jacket_hem_y,
            'jacket_ratio': jacket_ratio,
            'waistband_y': waistband_y,
            'waistband_ratio': waistband_ratio,
            'is_tucked': is_tucked,
            'exposed_midriff_gap': exposed_gap,
            'has_exposed_midriff': has_exposed_midriff,
            'navel_detected': navel_detected,
            'navel_status': navel_status,
            'navel_coords': navel_coords,
            'belt_loops_detected': belt_loops,
            'belt_loop_edge_count': peaks,
            'choker_detected': choker_detected,
            'dominant_top_rgb': top_rgb,
            'dominant_pants_rgb': pants_rgb,
            'dominant_jacket_rgb': top_rgb
        }

    return {
        'valid': True,
        'image_path': image_path,
        'filename': os.path.basename(image_path),
        'face': face_data,
        'pose': pose_data,
        'silhouette': silhouette_data,
        'attire': attire_data
    }

def audit_image_set(
    image_paths,
    baseline_path=None,
    persona_reference_path=None,
    tolerance_jacket=0.08,
    tolerance_face=0.70,
    tolerance_ref=0.40,
    tolerance_hourglass=0.12,
    gender='auto'
):
    if len(image_paths) == 0:
        return {'all_passed': False, 'error': 'No images provided'}
        
    if baseline_path is None or not os.path.exists(baseline_path):
        sorted_paths = sorted(image_paths)
        base_candidates = [p for p in sorted_paths if '01' in os.path.basename(p).lower() or 'base' in os.path.basename(p).lower() or 'm1' in os.path.basename(p).lower()]
        baseline_path = base_candidates[0] if len(base_candidates) > 0 else sorted_paths[0]

    base_analysis = analyze_single_image(baseline_path)
    if not base_analysis['valid']:
        return {'all_passed': False, 'error': f'Failed to analyze baseline: {base_analysis.get("error")}'}

    # Baseline face embedding
    base_emb = np.array(base_analysis['face']['embedding']) if base_analysis['face']['embedding'] is not None else None

    # External persona reference embedding (if provided)
    ref_emb = None
    if persona_reference_path and os.path.exists(persona_reference_path):
        ref_analysis = analyze_single_image(persona_reference_path)
        if ref_analysis['valid'] and ref_analysis['face']['embedding'] is not None:
            ref_emb = np.array(ref_analysis['face']['embedding'])

    # Determine persona gender (auto-detect or explicit)
    if gender in ['male', 'female']:
        persona_gender = gender
    else:
        persona_gender = base_analysis['face'].get('gender', 'auto')
        if persona_gender == 'auto' and ref_emb is not None:
            persona_gender = ref_analysis['face'].get('gender', 'female')
        if persona_gender == 'auto':
            persona_gender = 'female'

    report = {
        'all_passed': True,
        'baseline': {
            'path': baseline_path,
            'filename': os.path.basename(baseline_path),
            'identity_reference': os.path.basename(persona_reference_path) if persona_reference_path else os.path.basename(baseline_path),
            'gender': persona_gender,
            'jacket_ratio': base_analysis['attire']['jacket_ratio'],
            'is_tucked': base_analysis['attire']['is_tucked'],
            'bust_to_waist_ratio': base_analysis['silhouette']['bust_to_waist_ratio'],
            'has_exposed_midriff': base_analysis['attire']['has_exposed_midriff'],
            'navel_status': base_analysis['attire']['navel_status'],
            'belt_loops_detected': base_analysis['attire']['belt_loops_detected'],
            'choker_detected': base_analysis['attire']['choker_detected']
        },
        'results': []
    }

    base_jacket_r = base_analysis['attire']['jacket_ratio']
    base_bw_r = base_analysis['silhouette']['bust_to_waist_ratio']
    base_belt_loops = base_analysis['attire']['belt_loops_detected']
    base_choker = base_analysis['attire']['choker_detected']
    base_midriff = base_analysis['attire']['has_exposed_midriff']
    base_top_rgb = np.array(base_analysis['attire']['dominant_top_rgb'])
    base_pants_rgb = np.array(base_analysis['attire']['dominant_pants_rgb'])

    for img_path in image_paths:
        an = analyze_single_image(img_path)
        if not an['valid']:
            report['all_passed'] = False
            report['results'].append({
                'filename': os.path.basename(img_path),
                'passed': False,
                'reasons': [an.get('error', 'Analysis failed')]
            })
            continue

        reasons = []
        is_passed = True
        
        cand_emb = np.array(an['face']['embedding']) if an['face']['embedding'] is not None else None
        intra_sim = 1.0
        ref_sim = 1.0

        # 1. Intra-Set Face Cosine Similarity (vs Baseline M1)
        if base_emb is not None and cand_emb is not None:
            intra_sim = float(np.dot(base_emb, cand_emb))
            if intra_sim < tolerance_face:
                is_passed = False
                reasons.append(f'Intra-set face likeness drift: cosine similarity {intra_sim:.3f} < threshold {tolerance_face} vs baseline {os.path.basename(baseline_path)}')
        elif base_emb is not None and cand_emb is None:
            is_passed = False
            reasons.append('Face not detected by InsightFace')

        # 2. External Persona Ground Truth Reference (vs persona avatar reference)
        if ref_emb is not None and cand_emb is not None:
            ref_sim = float(np.dot(ref_emb, cand_emb))
            if ref_sim < tolerance_ref:
                is_passed = False
                reasons.append(f'Persona reference likeness drift: cosine similarity {ref_sim:.3f} < threshold {tolerance_ref} vs {os.path.basename(persona_reference_path)}')

        # 3. Outer Garment / Waistband Hem Ratio Audit
        cand_jacket_r = an['attire']['jacket_ratio']
        jacket_diff = abs(cand_jacket_r - base_jacket_r)
        if jacket_diff > tolerance_jacket:
            is_passed = False
            reasons.append(f'Garment length mismatch: ratio is {cand_jacket_r:.1%} vs baseline {base_jacket_r:.1%} (diff: {jacket_diff:.1%})')

        # 4. Color Continuity (Top & Pants Swatches)
        cand_top_rgb = np.array(an['attire']['dominant_top_rgb'])
        cand_pants_rgb = np.array(an['attire']['dominant_pants_rgb'])
        top_color_dist = float(np.linalg.norm(cand_top_rgb - base_top_rgb))
        pants_color_dist = float(np.linalg.norm(cand_pants_rgb - base_pants_rgb))
        if top_color_dist > 65.0:
            is_passed = False
            reasons.append(f'Upper garment color drift: RGB distance {top_color_dist:.1f} > 65.0 vs baseline')
        if pants_color_dist > 65.0:
            is_passed = False
            reasons.append(f'Trousers color drift: RGB distance {pants_color_dist:.1f} > 65.0 vs baseline')

        # 5. Silhouette & Body Curvature (Gender-Aware)
        if persona_gender == 'female':
            cand_bw_r = an['silhouette']['bust_to_waist_ratio']
            if base_bw_r > 1.15 and cand_bw_r > 0:
                bw_drop = (base_bw_r - cand_bw_r) / base_bw_r
                if bw_drop > tolerance_hourglass:
                    is_passed = False
                    reasons.append(f'Hourglass curvature / bust volume loss: B-W ratio dropped from {base_bw_r:.2f} to {cand_bw_r:.2f} ({bw_drop:.1%} loss)')
        else:
            # Male athletic frame V-taper check
            base_sh_r = base_analysis['pose']['sh_w'] / base_analysis['pose']['torso_len'] if base_analysis['pose']['torso_len'] > 0 else 0.6
            cand_sh_r = an['pose']['sh_w'] / an['pose']['torso_len'] if an['pose']['torso_len'] > 0 else 0.6
            if base_sh_r > 0 and cand_sh_r > 0:
                sh_diff = abs(cand_sh_r - base_sh_r) / base_sh_r
                if sh_diff > 0.28:
                    is_passed = False
                    reasons.append(f'Masculine V-taper frame drift: shoulder-torso ratio shifted by {sh_diff:.1%}')

        # 6. Exposed Midriff & Navel / Bellybutton Audit
        if base_midriff:
            if not an['attire']['has_exposed_midriff']:
                is_passed = False
                reasons.append('Midriff covered when baseline has exposed midriff')
            elif an['attire']['navel_status'] == 'missing':
                is_passed = False
                reasons.append(f'Missing bellybutton/navel in exposed midriff (skin gap: {an["attire"]["exposed_midriff_gap"]:.1f}px). Abdomen appears artificially smoothed.')
        else:
            if an['attire']['has_exposed_midriff']:
                is_passed = False
                reasons.append('Unintended exposed midriff detected on formal/covered baseline attire')

        # 7. Waistband Construction Audit (Belt Loops vs Seamless)
        cand_belt_loops = an['attire']['belt_loops_detected']
        if cand_belt_loops != base_belt_loops:
            is_passed = False
            reasons.append(f'Waistband construction mismatch: candidate has {"belt loops" if cand_belt_loops else "seamless waistband"} while baseline is {"belt loops" if base_belt_loops else "seamless waistband"}')

        # 8. Jewelry Continuity (Choker / Necklace)
        cand_choker = an['attire']['choker_detected']
        if cand_choker != base_choker:
            is_passed = False
            reasons.append(f'Necklace mismatch: candidate {"has choker" if cand_choker else "missing choker"} while baseline {"has choker" if base_choker else "missing choker"}')

        if not is_passed:
            report['all_passed'] = False

        report['results'].append({
            'filename': an['filename'],
            'passed': is_passed,
            'reasons': reasons,
            'metrics': {
                'face_similarity': round(intra_sim, 3),
                'reference_similarity': round(ref_sim, 3) if ref_emb is not None else None,
                'jacket_ratio': round(cand_jacket_r, 3),
                'bust_to_waist_ratio': round(an['silhouette']['bust_to_waist_ratio'], 3),
                'top_rgb': an['attire']['dominant_top_rgb'],
                'pants_rgb': an['attire']['dominant_pants_rgb'],
                'exposed_midriff': an['attire']['has_exposed_midriff'],
                'midriff_gap_px': round(an['attire']['exposed_midriff_gap'], 1),
                'navel_status': an['attire']['navel_status'],
                'belt_loops': cand_belt_loops,
                'choker': cand_choker
            }
        })

    return report

def main():
    parser = argparse.ArgumentParser(description='Automated Set Consistency Auditor')
    parser.add_argument('--dir', required=True, help='Directory containing image set')
    parser.add_argument('--baseline', default=None, help='Path to baseline reference image')
    parser.add_argument('--persona-reference', default=None, help='Path to persona ground truth avatar reference image')
    parser.add_argument('--pattern', default='*.jpg', help='Glob pattern for images')
    parser.add_argument('--json', action='store_true', help='Output JSON format')
    parser.add_argument('--gender', default='auto', choices=['auto', 'male', 'female'], help='Persona gender for silhouette auditing')
    parser.add_argument('--tolerance-jacket', type=float, default=0.08, help='Tolerance for garment/jacket length ratio')
    parser.add_argument('--tolerance-face', type=float, default=0.70, help='Cosine similarity threshold for intra-set face likeness')
    parser.add_argument('--tolerance-ref', type=float, default=0.40, help='Cosine similarity threshold vs external persona reference')
    parser.add_argument('--tolerance-hourglass', type=float, default=0.12, help='Tolerance for bust-waist ratio drop (female)')

    args = parser.parse_args()
    
    search_path = os.path.join(args.dir, args.pattern)
    files = glob.glob(search_path)
    if len(files) == 0:
        files = glob.glob(os.path.join(args.dir, '*.png'))
    files = [f for f in files if not os.path.basename(f).startswith('ruler_') and not os.path.basename(f).startswith('annotated_')]

    if len(files) == 0:
        if args.json:
            print("__CONSISTENCY_AUDIT_JSON_START__")
            print(json.dumps({'error': f'No matching images found in {args.dir}'}))
            print("__CONSISTENCY_AUDIT_JSON_END__")
        else:
            print(f'No matching images found in {args.dir}')
        sys.exit(1)

    report = audit_image_set(
        files,
        baseline_path=args.baseline,
        persona_reference_path=args.persona_reference,
        tolerance_jacket=args.tolerance_jacket,
        tolerance_face=args.tolerance_face,
        tolerance_ref=args.tolerance_ref,
        tolerance_hourglass=args.tolerance_hourglass,
        gender=args.gender
    )

    def json_default(o):
        if isinstance(o, (np.bool_, bool)):
            return bool(o)
        if isinstance(o, (np.floating, float)):
            return float(o)
        if isinstance(o, (np.integer, int)):
            return int(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return str(o)

    if args.json:
        print("__CONSISTENCY_AUDIT_JSON_START__")
        print(json.dumps(report, default=json_default, indent=2))
        print("__CONSISTENCY_AUDIT_JSON_END__")
    else:
        print("\n==================================================================")
        print("🛡️ MULTI-MODAL SET CONSISTENCY AUDITOR REPORT")
        print("==================================================================")
        print(f"Baseline:     {report['baseline']['filename']}")
        print(f"Identity Ref: {report['baseline']['identity_reference']}")
        print(f"Gender Mode:  {report['baseline']['gender']}")
        print(f"Total Images: {len(report['results'])}")
        status_icon = "🟢 PASSED" if report['all_passed'] else "🔴 FAILED (Consistency Violations Detected)"
        print(f"Set Status:   {status_icon}")
        print("------------------------------------------------------------------")
        for res in report['results']:
            mark = "✔ PASSED" if res['passed'] else "❌ FAILED"
            print(f"\n  [{mark}] {res['filename']}")
            m = res.get('metrics', {})
            loops_str = "Yes" if m.get('belt_loops') else "No"
            choker_str = "Yes" if m.get('choker') else "No"
            ref_str = f" | Ref Sim: {m.get('reference_similarity')}" if m.get('reference_similarity') is not None else ""
            print(f"     Face Sim: {m.get('face_similarity')}{ref_str} | Hem/Waist: {m.get('jacket_ratio', 0)*100:.1f}% | Loops: {loops_str} | Choker: {choker_str}")
            if not res['passed']:
                for r in res['reasons']:
                    print(f"     ⚠️ {r}")
        print("==================================================================\n")

    sys.exit(0 if report['all_passed'] else 1)

if __name__ == '__main__':
    main()
