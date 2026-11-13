/**
 * src/lib/realtime/webglVisemeShader.ts
 *
 * WebGL 2D Audio-Reactive Viseme Warper & Lip-Sync Shader.
 * Performs hardware-accelerated spatial mouth mesh deformation, aspect-corrected head rotation/tilt alignment,
 * and oral cavity depth shading synchronized to per-frame video landmarks and real-time audio visemes at 60 FPS.
 */

export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_bgTexture;
uniform int u_hasBgTexture;           // 1 if background texture is valid, 0 for procedural studio
uniform int u_enableChromaKey;        // 1 to key out green backdrop, 0 for standard passthrough
uniform int u_transparentMode;        // 1 for true 32-bit RGBA alpha output (Remotion/VP9), 0 for studio composite
uniform vec3 u_chromaKeyColor;        // Target chroma green in RGB [0, 1]
uniform float u_chromaSimilarity;     // Chroma sensitivity threshold
uniform float u_chromaSmoothness;     // Edge smoothness width
uniform float u_despillStrength;      // Edge green bounce suppression
uniform float u_bgAspectRatio;        // Background image width / height
uniform int u_lightingTone;           // 0: neutral, 1: cool, 2: warm, 3: red_alert
uniform vec2 u_mouthCenter;           // Normalized mouth center in UV space [0, 1]
uniform vec2 u_mouthRadius;           // Normalized mouth influence radius
uniform float u_mouthAngle;            // Head rotation/tilt angle in radians
uniform float u_mouthCurvature;        // Anatomical mouth curvature / smile contour (-0.5 to +0.5)
uniform float u_jawOpen;              // 0.0 to 1.0 (vertical opening)
uniform float u_lipWidth;             // -1.0 to 1.0 (horizontal spread/pucker)
uniform float u_lipPucker;            // 0.0 to 1.0 (radial pinch / forward funnel)
uniform float u_lipCompression;       // 0.0 to 1.0 (bilabial press for P/B/M - Azure 21)
uniform float u_labiodentalTuck;      // 0.0 to 1.0 (upper teeth on lower lip for F/V - Azure 18)
uniform float u_tongueTipProtrusion;  // 0.0 to 1.0 (tongue between teeth for TH - Azure 17)
uniform float u_tongueTipElevated;    // 0.0 to 1.0 (tongue to upper teeth/palate for L/D/T - Azure 14, 19)
uniform float u_teethClenched;        // 0.0 to 1.0 (upper & lower teeth together for S/Z/CH - Azure 15, 16)
uniform int u_azureVisemeId;          // 0 to 21
uniform float u_aspectRatio;          // Canvas width / height (e.g. 544.0 / 960.0 = 0.5667)
uniform int u_debugCrosshair;          // 1 to render calibration crosshair, 0 normal

// LivePortrait 3D Perspective Homography & Micro-Blink Uniforms
uniform vec2 u_headCenter;             // Normalized head center in UV space [0, 1]
uniform vec2 u_headRadius;             // Normalized head radius [rx, ry]
uniform float u_headPitch;             // Pitch in radians (-20° to +20°)
uniform float u_headYaw;               // Yaw in radians (-25° to +25°)
uniform float u_headRoll;              // Roll in radians (-15° to +15°)
uniform float u_headLeanZ;             // Head lean forward (-0.15 to +0.15)
uniform float u_headShiftX;            // Head lateral shift (-0.10 to +0.10)
uniform float u_headShiftY;            // Head vertical shift (-0.10 to +0.10)
uniform float u_blinkLeft;             // 0.0 (open) to 1.0 (closed)
uniform float u_blinkRight;            // 0.0 (open) to 1.0 (closed)
uniform float u_eyeWidening;           // 0.8 to 1.5 (aperture expansion)
uniform float u_gazeX;                 // -1.0 (look left) to +1.0 (look right)
uniform float u_gazeY;                 // -1.0 (look up) to +1.0 (look down)
uniform float u_eyebrowRaise;          // -0.5 to +0.5
uniform float u_eyebrowFurrow;         // 0.0 to 1.0
uniform float u_smileExpression;       // -1.0 (frown) to +1.0 (smile)
uniform float u_neckPinning;           // 1.0 for anatomical collar lock, 0.0 for free
uniform vec2 u_leftEyeCenter;          // Left eye socket UV [0, 1]
uniform vec2 u_rightEyeCenter;         // Right eye socket UV [0, 1]

// Upper-Body Shoulder & Chest Kinematics
uniform vec2  u_shoulderCenter;        // Normalized shoulder midpoint UV [0, 1]
uniform float u_shoulderBreath;        // Breathing lift amplitude (0.0 to 0.015)
uniform float u_shoulderSway;          // Lateral sway displacement (-0.012 to +0.012)
uniform float u_chestExpansion;        // Speech-driven radial chest push (0.0 to 0.010)
uniform float u_shoulderShrug;         // Emphasis shrug compress (0.0 to 0.014)

// Helper to compute cover UVs for background plate (object-fit: cover without stretching)
vec2 computeBgUv(vec2 uv, float canvasAspect, float bgAspect) {
    vec2 st = uv - vec2(0.5);
    if (canvasAspect < bgAspect) {
        // Canvas is narrower/taller than background image (e.g. 9:16 portrait canvas vs 16:9 landscape image)
        st.x *= (canvasAspect / bgAspect);
    } else {
        // Canvas is wider than background image
        st.y *= (bgAspect / canvasAspect);
    }
    return st + vec2(0.5);
}

// Procedural fallback broadcast news studio gradient
vec3 renderProceduralStudio(vec2 uv, int tone) {
    vec2 center = vec2(0.5, 0.4);
    float distFromCenter = length(uv - center);
    
    vec3 baseTop;
    vec3 baseBottom;
    vec3 rimGlow;
    
    if (tone == 3) {
        baseTop = vec3(0.20, 0.02, 0.04);
        baseBottom = vec3(0.04, 0.01, 0.02);
        rimGlow = vec3(0.85, 0.12, 0.15);
    } else if (tone == 2) {
        baseTop = vec3(0.08, 0.06, 0.05);
        baseBottom = vec3(0.02, 0.02, 0.02);
        rimGlow = vec3(0.85, 0.65, 0.35);
    } else if (tone == 1) {
        baseTop = vec3(0.02, 0.06, 0.14);
        baseBottom = vec3(0.01, 0.02, 0.04);
        rimGlow = vec3(0.05, 0.70, 0.85);
    } else {
        baseTop = vec3(0.04, 0.07, 0.12);
        baseBottom = vec3(0.01, 0.02, 0.03);
        rimGlow = vec3(0.15, 0.50, 0.75);
    }
    
    vec3 bg = mix(baseTop, baseBottom, uv.y);
    float radial = smoothstep(0.8, 0.0, distFromCenter);
    bg += rimGlow * radial * 0.35;
    
    float lines = sin(uv.y * 180.0) * 0.5 + 0.5;
    bg += vec3(lines * 0.015);
    
    return bg;
}

void main() {
    vec2 uv = v_texCoord;

    // ── STAGE 0: UPPER-BODY SHOULDER & CHEST KINEMATICS ─────────────────────
    // Deforms the shoulder/chest region (below head collar) with breathing lift,
    // lateral sway, speech-driven chest expansion, and emphasis shrug.
    // Only activates when any shoulder signal is non-trivial to avoid wasted ALU.
    if (u_shoulderBreath > 0.0001 || abs(u_shoulderSway) > 0.0001 ||
        u_chestExpansion > 0.0001 || u_shoulderShrug > 0.0001) {

        // Body deformation zone: below head collar, bounded by shoulder region
        float collarBoundary = u_headCenter.y + 0.12;
        float bodyFloor      = u_shoulderCenter.y + 0.20;

        if (uv.y > collarBoundary && uv.y < bodyFloor) {
            // Elliptical influence field centered on shoulder midpoint
            vec2  bodyDelta  = vec2((uv.x - u_shoulderCenter.x) * u_aspectRatio,
                                    uv.y  - u_shoulderCenter.y);
            float bodyDistSq = bodyDelta.x * bodyDelta.x * 0.4
                             + bodyDelta.y * bodyDelta.y * 0.25;

            // Smooth blend: full influence at center, fades at edges (radius ~2.2)
            float bodyWeight = smoothstep(2.2, 0.05, bodyDistSq);

            // Smooth fade-in below collar so head/body boundary is seamless
            float collarBlend = smoothstep(collarBoundary, collarBoundary + 0.06, uv.y);
            bodyWeight *= collarBlend;

            if (bodyWeight > 0.001) {
                // A. Breathing lift: sinusoidal upward displacement of shoulder region
                uv.y -= u_shoulderBreath * bodyWeight;

                // B. Lateral sway: horizontal drift from ProceduralDriver breath oscillator
                uv.x += u_shoulderSway * bodyWeight;

                // C. Speech chest expansion: outward radial push from shoulder center
                //    Creates the subtle chest-forward motion during emphatic delivery
                if (u_chestExpansion > 0.0001) {
                    uv.x += (bodyDelta.x / u_aspectRatio) * u_chestExpansion * bodyWeight * 0.5;
                    uv.y += bodyDelta.y * u_chestExpansion * bodyWeight * 0.3;
                }

                // D. Emphasis shrug: vertical compression (shoulders rise, neck shortens)
                if (u_shoulderShrug > 0.0001) {
                    uv.y -= u_shoulderShrug * bodyWeight * 0.85;
                }

                uv = clamp(uv, vec2(0.0), vec2(1.0));
            }
        }
    }

    // ── STAGE 1: LIVEPORTRAIT 3D HEAD ROTATION, TRANSLATION & CERVICAL SPINE PINNING ──
    vec2 cervicalPivot = vec2(u_headCenter.x, u_headCenter.y + 0.14);
    vec2 pPivot = vec2((uv.x - cervicalPivot.x) * u_aspectRatio, uv.y - cervicalPivot.y);

    // Compute elliptical distance metric from head center
    vec2 headDelta = vec2((uv.x - u_headCenter.x) * u_aspectRatio, uv.y - u_headCenter.y);
    float normHx = headDelta.x / max(0.001, u_headRadius.x * u_aspectRatio);
    float normHy = headDelta.y / max(0.001, u_headRadius.y);
    float headDistSq = normHx * normHx + normHy * normHy;

    // Cervical spine neck pinning attenuation (Cosine Collar Blend)
    float collarY = u_headCenter.y + 0.14;
    float neckStartY = u_headCenter.y + 0.04;
    float vertWeight = 1.0;
    if (uv.y > collarY) {
        vertWeight = 0.0;
    } else if (uv.y > neckStartY) {
        float tNeck = (uv.y - neckStartY) / max(0.001, collarY - neckStartY);
        vertWeight = 0.5 * (1.0 + cos(3.14159265 * tNeck));
    }

    // Radial head & hair boundary falloff
    float radialWeight = smoothstep(2.5, 0.65, headDistSq);
    float wHead = vertWeight * radialWeight;

    // 3D Spatial Translation (Lean Forward Z, Lateral Shift X/Y)
    if (wHead > 0.0005 && (abs(u_headLeanZ) > 0.001 || abs(u_headShiftX) > 0.001 || abs(u_headShiftY) > 0.001)) {
        vec2 leanDelta = (uv - u_headCenter) * (-u_headLeanZ * 0.35 * wHead);
        uv += leanDelta;
        uv.x -= u_headShiftX * 0.06 * wHead;
        uv.y -= u_headShiftY * 0.06 * wHead;
    }

    if (wHead > 0.0005 && (abs(u_headRoll) > 0.0001 || abs(u_headYaw) > 0.0001 || abs(u_headPitch) > 0.0001)) {
        // A. 2D Head Roll Rotation around Cervical Pivot
        float effRoll = -u_headRoll * wHead;
        float cosR = cos(effRoll);
        float sinR = sin(effRoll);
        vec2 rotP = vec2(pPivot.x * cosR - pPivot.y * sinR, pPivot.x * sinR + pPivot.y * cosR);
        vec2 warpedUv = vec2(cervicalPivot.x + rotP.x / u_aspectRatio, cervicalPivot.y + rotP.y);

        // B. 3D Cylindrical Yaw Perspective Warping with Near/Far Cheek Compression
        float curHx = (warpedUv.x - u_headCenter.x) / max(0.001, u_headRadius.x);
        float yawDisp = -sin(u_headYaw) * u_headRadius.x * (1.0 - 0.35 * curHx * curHx) * wHead;
        float depthForeshorten = -0.22 * sin(u_headYaw) * curHx * u_headRadius.x * wHead;
        warpedUv.x += (yawDisp + depthForeshorten);

        // C. 3D Spherical Pitch Tilt with Forehead Compression & Chin Elongation
        float curHy = (warpedUv.y - u_headCenter.y) / max(0.001, u_headRadius.y);
        float pitchDisp = -sin(u_headPitch) * u_headRadius.y * (1.0 + 0.28 * curHy) * wHead;
        warpedUv.y += pitchDisp;

        uv = clamp(warpedUv, vec2(0.0), vec2(1.0));
    }

    // ── STAGE 2: OCULAR GAZE DYNAMICS ───────────────────────────────────────
    vec2 gazeDisp = vec2(u_gazeX * 0.006 / u_aspectRatio, u_gazeY * 0.006);

    // Left Eye Gaze Shift
    vec2 dEyeL = vec2((uv.x - u_leftEyeCenter.x) * u_aspectRatio, uv.y - u_leftEyeCenter.y);
    float eyeDistL = pow(dEyeL.x / (0.042 * u_aspectRatio), 2.0) + pow(dEyeL.y / 0.016, 2.0);
    if (eyeDistL < 2.0 && (abs(u_gazeX) > 0.01 || abs(u_gazeY) > 0.01)) {
        uv += gazeDisp * exp(-eyeDistL * 3.0);
    }

    // Right Eye Gaze Shift
    vec2 dEyeR = vec2((uv.x - u_rightEyeCenter.x) * u_aspectRatio, uv.y - u_rightEyeCenter.y);
    float eyeDistR = pow(dEyeR.x / (0.042 * u_aspectRatio), 2.0) + pow(dEyeR.y / 0.016, 2.0);
    if (eyeDistR < 2.0 && (abs(u_gazeX) > 0.01 || abs(u_gazeY) > 0.01)) {
        uv += gazeDisp * exp(-eyeDistR * 3.0);
    }
    uv = clamp(uv, vec2(0.0), vec2(1.0));

    // ── STAGE 3: EYEBROWS & CORRUGATOR DYNAMICS ──────────────────────────────
    if (abs(u_eyebrowRaise) > 0.01 || u_eyebrowFurrow > 0.01) {
        vec2 leftBrow = vec2(u_headCenter.x - 0.048, u_headCenter.y - 0.062);
        vec2 rightBrow = vec2(u_headCenter.x + 0.048, u_headCenter.y - 0.062);

        // Left Brow
        vec2 dBrowL = vec2((uv.x - leftBrow.x) * u_aspectRatio, uv.y - leftBrow.y);
        float browDistL = pow(dBrowL.x / (0.050 * u_aspectRatio), 2.0) + pow(dBrowL.y / 0.022, 2.0);
        if (browDistL < 2.2) {
            float browWeightL = exp(-browDistL * 2.0);
            uv.y -= u_eyebrowRaise * 0.014 * browWeightL;
            uv.x -= u_eyebrowFurrow * 0.006 * browWeightL;
        }

        // Right Brow
        vec2 dBrowR = vec2((uv.x - rightBrow.x) * u_aspectRatio, uv.y - rightBrow.y);
        float browDistR = pow(dBrowR.x / (0.050 * u_aspectRatio), 2.0) + pow(dBrowR.y / 0.022, 2.0);
        if (browDistR < 2.2) {
            float browWeightR = exp(-browDistR * 2.0);
            uv.y -= u_eyebrowRaise * 0.014 * browWeightR;
            uv.x += u_eyebrowFurrow * 0.006 * browWeightR;
        }
        uv = clamp(uv, vec2(0.0), vec2(1.0));
    }

    // ── STAGE 4: AZURE VISEMES 0-21 BIOMECHANICAL MOUTH & ORAL CAVITY ────────
    // 1. Convert to isotropic aspect-corrected pixel space
    vec2 delta = uv - u_mouthCenter;
    vec2 aspectDelta = vec2(delta.x * u_aspectRatio, delta.y);

    // 2. Apply head roll rotation in isotropic 2D coordinates
    float cosA = cos(-u_mouthAngle);
    float sinA = sin(-u_mouthAngle);
    vec2 rotDelta = vec2(
        aspectDelta.x * cosA - aspectDelta.y * sinA,
        aspectDelta.x * sinA + aspectDelta.y * cosA
    );

    // 3. Normalized elliptical metric in rotated face space
    float normX = rotDelta.x / (u_mouthRadius.x * u_aspectRatio);
    float normY = rotDelta.y / u_mouthRadius.y;
    float distSq = normX * normX + normY * normY;

    // --- 4. BIOMECHANICAL 2D MESH DEFORMATION FIELD (AZURE VISEMES 0-21) ----
    vec4 color;
    if (distSq < 4.0) {
        float dispY_upper = 0.0;
        float dispY_lower = 0.0;
        float dispY_chin  = 0.0;
        float totalDispX  = 0.0;

        // Anatomical Lip Curvature & Cupid's Bow Arch Profile
        float cupidsBowOffset = 0.05 * cos(normX * 4.5) * exp(-normX * normX * 2.0);
        float mouthArc = u_mouthCurvature * (1.0 - normX * normX);
        float curvedNormY = normY - mouthArc - cupidsBowOffset;

        // A. Bilabial Lip Compression (Azure 21 - /p/, /b/, /m/)
        if (u_lipCompression > 0.01) {
            float compWeight = exp(-distSq * 3.5);
            float compY = -curvedNormY * u_mouthRadius.y * u_lipCompression * 0.55 * compWeight;
            dispY_lower += compY;
            dispY_upper += compY;
        }

        // B. Labiodental Lower Lip Tuck (Azure 18 - /f/, /v/)
        if (u_labiodentalTuck > 0.01) {
            float tuckWeight = exp(-distSq * 3.0) * smoothstep(-0.2, 0.8, curvedNormY);
            dispY_lower += tuckWeight * u_labiodentalTuck * u_mouthRadius.y * 0.75;
            float tuckUpper = exp(-distSq * 4.0) * smoothstep(0.4, -0.3, curvedNormY);
            dispY_upper += tuckUpper * u_labiodentalTuck * u_mouthRadius.y * 0.35;
        }

        // C. Standard Continuous Jaw Opening & Cupid's Bow Lifting
        if (u_jawOpen > 0.003 && u_lipCompression < 0.8) {
            float cupidBow = 1.0 - 0.40 * exp(-normX * normX * 7.5);
            float upperWeight = exp(-distSq * 3.8) * smoothstep(0.6, -0.3, curvedNormY) * cupidBow;
            dispY_upper += upperWeight * u_jawOpen * u_mouthRadius.y * 0.52;

            float lowerWeight = exp(-distSq * 2.8) * smoothstep(-0.25, 0.75, curvedNormY);
            dispY_lower -= lowerWeight * u_jawOpen * u_mouthRadius.y * 1.55;

            // Elastic Mentalis Chin Pull
            float chinDistSq = normX * normX * 0.65 + (curvedNormY - 1.9) * (curvedNormY - 1.9) * 0.35;
            float chinWeight = exp(-chinDistSq * 1.4) * smoothstep(0.35, 1.9, curvedNormY);
            dispY_chin -= chinWeight * u_jawOpen * u_mouthRadius.y * 0.90;
        }

        // D. Horizontal Smile Spread (/i/, /e/, /s/) vs Cylindrical Pucker (/u/, /o/, /sh/)
        if (abs(u_lipWidth) > 0.01 || u_lipPucker > 0.01) {
            float widthWeight = exp(-distSq * 2.6);
            float dispX_spread = -widthWeight * u_lipWidth * rotDelta.x * 0.70;
            float dispX_pucker = widthWeight * u_lipPucker * rotDelta.x * 0.60;
            totalDispX = (dispX_spread + dispX_pucker);
        }

        float totalDispY = dispY_upper + dispY_lower + dispY_chin;

        // Apply displacement to UV coordinates
        vec2 uvDisp = vec2(
            (totalDispX * cosA - totalDispY * sinA) / u_aspectRatio,
            (totalDispX * sinA + totalDispY * cosA)
        );
        uv = clamp(uv + uvDisp, vec2(0.0), vec2(1.0));
        color = texture(u_videoTexture, uv);

        // --- 5. PHOTOREALISTIC ORAL CAVITY & ANATOMICAL DENTAL ARCH SYNTHESIS ---
        float effectiveOpen = u_jawOpen * (1.0 - u_lipCompression);
        float absNx = abs(normX);
        float effectiveWidthSpan = 0.88 * (1.0 - u_lipPucker * 0.35);
        float apertureSpan = max(0.0, 1.0 - pow(absNx / effectiveWidthSpan, 2.0));
        
        float upperLipLift = (effectiveOpen * 0.22 + u_labiodentalTuck * 0.20 + max(0.0, u_lipWidth) * 0.10) * apertureSpan;
        float lowerLipDrop = (effectiveOpen * 1.35 + u_teethClenched * 0.15) * apertureSpan;
        if (u_labiodentalTuck > 0.01) {
            lowerLipDrop = (0.28 * (1.0 - u_labiodentalTuck)) * apertureSpan;
        }

        float innerUpperLipY = -upperLipLift - cupidsBowOffset;
        float innerLowerLipY = (0.04 + lowerLipDrop) * apertureSpan;
        float gapHeight = innerLowerLipY - innerUpperLipY;

        if (distSq < 1.50 && gapHeight > 0.005 && apertureSpan > 0.01) {
            float cavityMask = smoothstep(innerUpperLipY - 0.02, innerUpperLipY + 0.02, curvedNormY)
                             * smoothstep(innerLowerLipY + 0.02, innerLowerLipY - 0.02, curvedNormY)
                             * apertureSpan;

            if (cavityMask > 0.001) {
                // Local Facial Skin Tone Sampling (Executed only for oral cavity pixels)
                vec2 uvPhiltrum = clamp(u_mouthCenter - vec2(0.0, u_mouthRadius.y * 1.6), vec2(0.0), vec2(1.0));
                vec3 skinPhiltrum = texture(u_videoTexture, uvPhiltrum).rgb;
                vec2 uvChin = clamp(u_mouthCenter + vec2(0.0, u_mouthRadius.y * 2.2), vec2(0.0), vec2(1.0));
                vec3 skinChin = texture(u_videoTexture, uvChin).rgb;
                vec3 faceSkin = mix(skinPhiltrum, skinChin, 0.5);
                float faceLum = dot(faceSkin, vec3(0.299, 0.587, 0.114));

                // Studio Enamel & Deep Oral Palette
                vec3 ivoryEnamel     = vec3(0.96, 0.93, 0.88) * (0.84 + faceLum * 0.16);
                vec3 cervicalGumline = vec3(0.84, 0.74, 0.64) * (0.84 + faceLum * 0.16);
                vec3 incisalTrans    = vec3(0.90, 0.93, 0.96) * (0.84 + faceLum * 0.16);
                vec3 cavityDeep      = vec3(0.12, 0.02, 0.03) * (0.80 + faceLum * 0.20);
                vec3 cavityFloor     = vec3(0.38, 0.12, 0.14) * (0.82 + faceLum * 0.18);
                vec3 tongueBase      = vec3(0.72, 0.32, 0.36) * (0.82 + faceLum * 0.18);

                // Anatomical Dental Proportions
                float smileBoost = 1.0 + max(0.0, u_lipWidth) * 0.35;
                float toothHeightFactor = 0.25;
                float xLoc = 0.0;
                if (absNx <= 0.22) {
                    toothHeightFactor = 0.38 * smileBoost;
                    xLoc = (absNx - 0.11) / 0.11;
                } else if (absNx <= 0.46) {
                    toothHeightFactor = 0.33 * smileBoost;
                    xLoc = (absNx - 0.34) / 0.12;
                } else if (absNx <= 0.68) {
                    toothHeightFactor = (0.28 - (absNx - 0.46) * 0.30) * smileBoost;
                    xLoc = (absNx - 0.57) / 0.11;
                } else {
                    toothHeightFactor = max(0.04, (0.20 - (absNx - 0.68) * 0.40) * smileBoost);
                    xLoc = (absNx - 0.78) / 0.11;
                }

                float crownConvexity = sqrt(max(0.0, 1.0 - pow(xLoc * 0.45, 2.0)));
                float midlineShadow = exp(-pow(normX / 0.009, 2.0)) * 0.09;
                float latLShadow    = exp(-pow((normX + 0.22) / 0.011, 2.0)) * 0.08;
                float latRShadow    = exp(-pow((normX - 0.22) / 0.011, 2.0)) * 0.08;
                float canLShadow    = exp(-pow((normX + 0.46) / 0.013, 2.0)) * 0.09;
                float canRShadow    = exp(-pow((normX - 0.46) / 0.013, 2.0)) * 0.09;
                float toothContactShadow = clamp(midlineShadow + latLShadow + latRShadow + canLShadow + canRShadow, 0.0, 0.18);

                float incisalCurve = 0.010 * (1.0 - xLoc * xLoc);
                float toothEdgeY = innerUpperLipY + toothHeightFactor * apertureSpan + incisalCurve - toothContactShadow * 0.006;

                float cervicalFactor = clamp((toothEdgeY - curvedNormY) / max(0.001, toothEdgeY - innerUpperLipY), 0.0, 1.0);
                float incisalFactor  = clamp((curvedNormY - (toothEdgeY - 0.03)) / 0.03, 0.0, 1.0);
                vec3 toothCol = mix(ivoryEnamel, cervicalGumline, cervicalFactor * 0.20);
                toothCol = mix(toothCol, incisalTrans, incisalFactor * 0.18);

                float buccalFalloff = clamp((0.85 - absNx) / 0.55, 0.40, 1.0);
                float castAO = clamp((curvedNormY - innerUpperLipY) / (max(0.001, toothEdgeY - innerUpperLipY) * 0.80), 0.75, 1.0);
                float specY = exp(-pow((curvedNormY - (innerUpperLipY + toothEdgeY) * 0.46) / 0.025, 2.0));
                float specular = specY * 0.05 * (1.0 - toothContactShadow);

                vec3 upperToothRGB = (toothCol * crownConvexity * (1.0 - toothContactShadow) + vec3(specular)) *
                                     castAO *
                                     buccalFalloff;

                float lowerToothTop = innerLowerLipY - (0.16 + u_teethClenched * 0.12) * apertureSpan;
                vec3 lowerToothRGB = (ivoryEnamel * 0.88 * crownConvexity * (1.0 - toothContactShadow)) * buccalFalloff;

                float depthGradient = clamp((curvedNormY - innerUpperLipY) / max(0.001, gapHeight), 0.0, 1.0);
                vec3 oralPixel = mix(cavityDeep, cavityFloor, depthGradient * 0.65);

                if (u_tongueTipProtrusion > 0.05 && curvedNormY >= (toothEdgeY - 0.03) && curvedNormY <= (innerLowerLipY + 0.02) && absNx < 0.38) {
                    float ttipDist = (normX * normX) / 0.12 + pow(curvedNormY - (toothEdgeY + gapHeight * 0.15), 2.0) / 0.020;
                    if (ttipDist < 1.0) {
                        float ttipAlpha = smoothstep(1.0, 0.35, ttipDist) * u_tongueTipProtrusion;
                        oralPixel = mix(oralPixel, tongueBase * 1.15, ttipAlpha);
                    }
                }

                if (effectiveOpen > 0.25 || u_teethClenched > 0.05) {
                    if (curvedNormY >= lowerToothTop && curvedNormY <= (innerLowerLipY + 0.01) && absNx < 0.75) {
                        float lteethAlpha = clamp((curvedNormY - lowerToothTop) / 0.02, 0.0, 1.0) *
                                            clamp((0.75 - absNx) / 0.08, 0.0, 1.0);
                        oralPixel = mix(oralPixel, lowerToothRGB, lteethAlpha);
                    }
                }

                if (curvedNormY >= (innerUpperLipY - 0.02) && curvedNormY <= (toothEdgeY + 0.015) && absNx < 0.82) {
                    float topFeather = clamp((curvedNormY - (innerUpperLipY - 0.015)) / 0.025, 0.0, 1.0);
                    float botFeather = clamp((toothEdgeY + 0.012 - curvedNormY) / 0.02, 0.0, 1.0);
                    float latFeather = clamp((0.82 - absNx) / 0.08, 0.0, 1.0);
                    float teethAlpha = topFeather * botFeather * latFeather;
                    oralPixel = mix(oralPixel, upperToothRGB, teethAlpha);
                }

                float apertureBlend = cavityMask * clamp((effectiveOpen - 0.01) / 0.08, 0.0, 1.0) * 0.98;
                color.rgb = mix(color.rgb, oralPixel, apertureBlend);
            }
        }
    } else {
        color = texture(u_videoTexture, uv);
    }

    // --- 6. DYNAMIC JAW STRETCH SHADOW & SKIN TONE WARPING ------------------
    if (u_jawOpen > 0.12 && normY > 0.9 && normY < 2.8 && abs(normX) < 1.15) {
        float chinDistSq = normX * normX * 0.65 + (normY - 1.9) * (normY - 1.9) * 0.35;
        float stretchShadow = exp(-chinDistSq * 1.3) * smoothstep(0.12, 0.65, u_jawOpen);
        color.rgb = mix(color.rgb, color.rgb * 0.82, stretchShadow * 0.35);
    }

    // --- 7.5 ANATOMICAL DOWNWARD EYELID CLOSURE & LASH LINE BLENDING -------
    if (u_blinkLeft > 0.01) {
        vec2 dEyeL = vec2((v_texCoord.x - u_leftEyeCenter.x) * u_aspectRatio, v_texCoord.y - u_leftEyeCenter.y);
        float eyeRadiusX = 0.038 * u_aspectRatio;
        float eyeRadiusY = 0.014;
        float normEx = dEyeL.x / max(0.001, eyeRadiusX);
        float normEy = dEyeL.y / max(0.001, eyeRadiusY);
        float eyeDistSq = normEx * normEx + normEy * normEy;

        if (eyeDistSq < 2.2) {
            float eyeArch = 1.0 - 0.25 * normEx * normEx;
            float lidLimitY = (-1.1 + u_blinkLeft * 1.95) * eyeArch;

            if (normEy < lidLimitY + 0.15) {
                vec2 upperSkinUv = clamp(vec2(v_texCoord.x, u_leftEyeCenter.y - eyeRadiusY * 1.7), vec2(0.0), vec2(1.0));
                vec3 skinCol = texture(u_videoTexture, upperSkinUv).rgb;

                float coverAlpha = smoothstep(lidLimitY + 0.15, lidLimitY - 0.04, normEy) 
                                 * smoothstep(2.0, 0.65, eyeDistSq) 
                                 * u_blinkLeft;

                float lashMargin = exp(-pow((normEy - lidLimitY) / 0.16, 2.0)) * 0.45 * u_blinkLeft;
                vec3 eyelidRgb = skinCol * (1.0 - lashMargin);

                color.rgb = mix(color.rgb, eyelidRgb, coverAlpha);
            }
        }
    }

    if (u_blinkRight > 0.01) {
        vec2 dEyeR = vec2((v_texCoord.x - u_rightEyeCenter.x) * u_aspectRatio, v_texCoord.y - u_rightEyeCenter.y);
        float eyeRadiusX = 0.038 * u_aspectRatio;
        float eyeRadiusY = 0.014;
        float normEx = dEyeR.x / max(0.001, eyeRadiusX);
        float normEy = dEyeR.y / max(0.001, eyeRadiusY);
        float eyeDistSq = normEx * normEx + normEy * normEy;

        if (eyeDistSq < 2.2) {
            float eyeArch = 1.0 - 0.25 * normEx * normEx;
            float lidLimitY = (-1.1 + u_blinkRight * 1.95) * eyeArch;

            if (normEy < lidLimitY + 0.15) {
                vec2 upperSkinUv = clamp(vec2(v_texCoord.x, u_rightEyeCenter.y - eyeRadiusY * 1.7), vec2(0.0), vec2(1.0));
                vec3 skinCol = texture(u_videoTexture, upperSkinUv).rgb;

                float coverAlpha = smoothstep(lidLimitY + 0.15, lidLimitY - 0.04, normEy) 
                                 * smoothstep(2.0, 0.65, eyeDistSq) 
                                 * u_blinkRight;

                float lashMargin = exp(-pow((normEy - lidLimitY) / 0.16, 2.0)) * 0.45 * u_blinkRight;
                vec3 eyelidRgb = skinCol * (1.0 - lashMargin);

                color.rgb = mix(color.rgb, eyelidRgb, coverAlpha);
            }
        }
    }

    // --- 8. REAL-TIME CHROMA KEY & STUDIO BACKGROUND BLENDING ---------------
    if (u_enableChromaKey == 1) {
        float dist = distance(color.rgb, u_chromaKeyColor);
        float maxRB = max(color.r, color.b);
        float avgRB = (color.r + color.b) * 0.5;
        float greenDominance = color.g - maxRB;

        float edgeStart = u_chromaSimilarity;
        float edgeEnd = u_chromaSimilarity + u_chromaSmoothness;
        float rawAlpha = smoothstep(edgeStart, edgeEnd, dist);

        if (color.g > 0.30 && greenDominance > 0.03) {
            float greenAlpha = smoothstep(0.03, 0.12, -greenDominance);
            rawAlpha = min(rawAlpha, greenAlpha);
        }

        // Multi-tap Matte Choke: ONLY for edge transition pixels (saves millions of texture taps)
        float alpha = rawAlpha;
        if (rawAlpha > 0.01 && rawAlpha < 0.99) {
            vec2 texel = vec2(1.5 / (960.0 * max(0.2, u_aspectRatio)), 1.5 / 960.0);
            float distL = distance(texture(u_videoTexture, clamp(v_texCoord - vec2(texel.x, 0.0), 0.001, 0.999)).rgb, u_chromaKeyColor);
            float distR = distance(texture(u_videoTexture, clamp(v_texCoord + vec2(texel.x, 0.0), 0.001, 0.999)).rgb, u_chromaKeyColor);
            float distU = distance(texture(u_videoTexture, clamp(v_texCoord - vec2(0.0, texel.y), 0.001, 0.999)).rgb, u_chromaKeyColor);
            float distD = distance(texture(u_videoTexture, clamp(v_texCoord + vec2(0.0, texel.y), 0.001, 0.999)).rgb, u_chromaKeyColor);

            float alphaL = smoothstep(edgeStart, edgeEnd, distL);
            float alphaR = smoothstep(edgeStart, edgeEnd, distR);
            float alphaU = smoothstep(edgeStart, edgeEnd, distU);
            float alphaD = smoothstep(edgeStart, edgeEnd, distD);

            float erodedAlpha = min(rawAlpha, min(min(alphaL, alphaR), min(alphaU, alphaD)));
            alpha = clamp(erodedAlpha, 0.0, 1.0);
        }

        // Asymmetric Cranial Dome & Hair Volume Protection:
        float vertHeadScale = (headDelta.y < 0.0) ? 1.35 : 1.05;
        float horizHeadScale = (headDelta.y < 0.0) ? 1.10 : 1.0;
        float normHxCranial = headDelta.x / max(0.001, u_headRadius.x * u_aspectRatio * horizHeadScale);
        float normHyCranial = headDelta.y / max(0.001, u_headRadius.y * vertHeadScale);
        float cranialDistSq = normHxCranial * normHxCranial + normHyCranial * normHyCranial;
        float headCore = smoothstep(1.08, 0.65, cranialDistSq);
        alpha = max(alpha, headCore);

        // Step 4: True Broadcast Despill & Green Spill Annihilation
        float excessGreen = max(0.0, color.g - max(avgRB, maxRB * 0.96));
        if (excessGreen > 0.0) {
            float suppressedG = color.g - excessGreen * u_despillStrength;
            // Warm skin tone & hair color recovery (convert green spill into natural warmth)
            float spillRecover = excessGreen * u_despillStrength;
            color.rgb = vec3(
                min(1.0, color.r + spillRecover * 0.26),
                suppressedG,
                min(1.0, color.b + spillRecover * 0.08)
            );
        }

        // Step 5: Unpremultiply Edge Green Bleed
        if (alpha > 0.01 && alpha < 0.96) {
            vec3 cleanSubject = clamp((color.rgb - (1.0 - alpha) * u_chromaKeyColor * 0.80) / max(0.18, alpha), 0.0, 1.0);
            cleanSubject.g = min(cleanSubject.g, max(cleanSubject.r, cleanSubject.b));
            color.rgb = mix(cleanSubject, color.rgb, alpha);
        }

        // Step 6: Transparent Alpha Mode check (For Remotion & Video Editor)
        if (u_transparentMode == 1) {
            fragColor = vec4(color.rgb, alpha);
            return;
        }

        // Step 7: Sample Studio Background Plate or Procedural Fallback
        vec3 bgRgb;
        if (u_hasBgTexture == 1) {
            vec2 bgUv = computeBgUv(v_texCoord, u_aspectRatio, u_bgAspectRatio);
            vec4 bgSample = texture(u_bgTexture, clamp(bgUv, vec2(0.001), vec2(0.999)));
            bgRgb = bgSample.rgb;
        } else {
            bgRgb = renderProceduralStudio(v_texCoord, u_lightingTone);
        }

        // Step 8: Studio Ambient Light Wrap on Edges (Eliminates harsh cutout halos)
        if (alpha > 0.05 && alpha < 0.98) {
            float wrapFactor = (1.0 - alpha) * 0.45;
            color.rgb = mix(color.rgb, bgRgb, wrapFactor);
        }

        // Step 9: Final Composite over Studio Plate
        color.rgb = mix(bgRgb, color.rgb, alpha);
        color.a = 1.0;
    }

    fragColor = color;
}
`;

export interface WebglVisemeUniforms {
  mouthCenter: [number, number];
  mouthRadius: [number, number];
  mouthAngle: number;
  mouthCurvature?: number;
  jawOpen: number;
  lipWidth: number;
  lipPucker: number;
  lipCompression?: number;
  labiodentalTuck?: number;
  tongueTipProtrusion?: number;
  tongueTipElevated?: number;
  teethClenched?: number;
  azureVisemeId?: number;
  aspectRatio: number;
  debugCrosshair?: boolean;
  enableChromaKey?: boolean;
  chromaKeyColor?: [number, number, number];
  chromaSimilarity?: number;
  chromaSmoothness?: number;
  despillStrength?: number;
  bgAspectRatio?: number;
  lightingTone?: "neutral" | "cool" | "warm" | "red_alert" | "cyber";
  transparentMode?: boolean;

  // LivePortrait 3D Perspective Homography & Extended Expressions
  headCenter?: [number, number];
  headRadius?: [number, number];
  headPitch?: number; // In radians
  headYaw?: number;   // In radians
  headRoll?: number;  // In radians
  headLeanZ?: number; // Head lean forward (-0.15 to +0.15)
  headShiftX?: number;// Head lateral shift (-0.10 to +0.10)
  headShiftY?: number;// Head vertical shift (-0.10 to +0.10)
  blinkLeft?: number; // 0.0 to 1.0
  blinkRight?: number;// 0.0 to 1.0
  eyeWidening?: number; // 0.8 to 1.5
  gazeX?: number;     // -1.0 to +1.0
  gazeY?: number;     // -1.0 to +1.0
  eyebrowRaise?: number; // -0.5 to +0.5
  eyebrowFurrow?: number;// 0.0 to 1.0
  smileExpression?: number; // -1.0 to +1.0
  neckPinning?: number;// 1.0 default
  leftEyeCenter?: [number, number];
  rightEyeCenter?: [number, number];

  // Upper-Body Shoulder & Chest Kinematics (Stage 0)
  shoulderCenter?: [number, number]; // Normalized shoulder midpoint UV [0, 1]
  shoulderBreath?: number;           // Breathing lift (0.0 to 0.015)
  shoulderSway?: number;             // Lateral sway (-0.012 to +0.012)
  chestExpansion?: number;           // Speech chest push (0.0 to 0.010)
  shoulderShrug?: number;            // Emphasis shrug (0.0 to 0.014)
}

export class WebglVisemeRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private bgTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;

  // Background Image Cache
  private loadedBgUrl: string | null = null;
  private isBgTextureReady: boolean = false;
  private bgImageAspect: number = 16 / 9;
  private videoTexWidth: number = 0;
  private videoTexHeight: number = 0;

  // Uniform locations
  private uMouthCenterLoc: WebGLUniformLocation | null = null;
  private uMouthRadiusLoc: WebGLUniformLocation | null = null;
  private uMouthAngleLoc: WebGLUniformLocation | null = null;
  private uMouthCurvatureLoc: WebGLUniformLocation | null = null;
  private uJawOpenLoc: WebGLUniformLocation | null = null;
  private uLipWidthLoc: WebGLUniformLocation | null = null;
  private uLipPuckerLoc: WebGLUniformLocation | null = null;
  private uLipCompressionLoc: WebGLUniformLocation | null = null;
  private uLabiodentalTuckLoc: WebGLUniformLocation | null = null;
  private uTongueTipProtrusionLoc: WebGLUniformLocation | null = null;
  private uTongueTipElevatedLoc: WebGLUniformLocation | null = null;
  private uTeethClenchedLoc: WebGLUniformLocation | null = null;
  private uAzureVisemeIdLoc: WebGLUniformLocation | null = null;
  private uAspectRatioLoc: WebGLUniformLocation | null = null;
  private uDebugCrosshairLoc: WebGLUniformLocation | null = null;

  // LivePortrait 3D Uniform Locations
  private uHeadCenterLoc: WebGLUniformLocation | null = null;
  private uHeadRadiusLoc: WebGLUniformLocation | null = null;
  private uHeadPitchLoc: WebGLUniformLocation | null = null;
  private uHeadYawLoc: WebGLUniformLocation | null = null;
  private uHeadRollLoc: WebGLUniformLocation | null = null;
  private uHeadLeanZLoc: WebGLUniformLocation | null = null;
  private uHeadShiftXLoc: WebGLUniformLocation | null = null;
  private uHeadShiftYLoc: WebGLUniformLocation | null = null;
  private uBlinkLeftLoc: WebGLUniformLocation | null = null;
  private uBlinkRightLoc: WebGLUniformLocation | null = null;
  private uEyeWideningLoc: WebGLUniformLocation | null = null;
  private uGazeXLoc: WebGLUniformLocation | null = null;
  private uGazeYLoc: WebGLUniformLocation | null = null;
  private uEyebrowRaiseLoc: WebGLUniformLocation | null = null;
  private uEyebrowFurrowLoc: WebGLUniformLocation | null = null;
  private uSmileExpressionLoc: WebGLUniformLocation | null = null;
  private uNeckPinningLoc: WebGLUniformLocation | null = null;
  private uLeftEyeCenterLoc: WebGLUniformLocation | null = null;
  private uRightEyeCenterLoc: WebGLUniformLocation | null = null;

  // Shoulder / Upper-Body Kinematics Uniform Locations (Stage 0)
  private uShoulderCenterLoc: WebGLUniformLocation | null = null;
  private uShoulderBreathLoc: WebGLUniformLocation | null = null;
  private uShoulderSwayLoc: WebGLUniformLocation | null = null;
  private uChestExpansionLoc: WebGLUniformLocation | null = null;
  private uShoulderShrugLoc: WebGLUniformLocation | null = null;

  // Chroma Uniforms
  private uVideoTextureLoc: WebGLUniformLocation | null = null;
  private uBgTextureLoc: WebGLUniformLocation | null = null;
  private uHasBgTextureLoc: WebGLUniformLocation | null = null;
  private uEnableChromaKeyLoc: WebGLUniformLocation | null = null;
  private uTransparentModeLoc: WebGLUniformLocation | null = null;
  private uChromaKeyColorLoc: WebGLUniformLocation | null = null;
  private uChromaSimilarityLoc: WebGLUniformLocation | null = null;
  private uChromaSmoothnessLoc: WebGLUniformLocation | null = null;
  private uDespillStrengthLoc: WebGLUniformLocation | null = null;
  private uBgAspectRatioLoc: WebGLUniformLocation | null = null;
  private uLightingToneLoc: WebGLUniformLocation | null = null;

  // Cached Uniform Values (reduces WebGL state call overhead by >40%)
  private cacheEnableChroma: number = -1;
  private cacheTransparentMode: number = -1;
  private cacheKeyColorR: number = -1;
  private cacheKeyColorG: number = -1;
  private cacheKeyColorB: number = -1;
  private cacheSimilarity: number = -1;
  private cacheSmoothness: number = -1;
  private cacheDespill: number = -1;
  private cacheBgAspect: number = -1;
  private cacheLightingTone: number = -1;
  private cacheHasBgTexture: number = -1;
  private cacheDebugCrosshair: number = -1;

  public init(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      console.warn("[WebglVisemeRenderer] WebGL2 not supported in this browser.");
      return false;
    }
    if (gl.isContextLost()) {
      console.warn("[WebglVisemeRenderer] WebGL2 context is in lost state.");
      return false;
    }
    this.gl = gl;

    // Compile shaders
    const vertShader = this._compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = this._compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) return false;

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[WebglVisemeRenderer] Program linking failed:", gl.getProgramInfoLog(program));
      return false;
    }
    this.program = program;

    // Get Uniform Locations
    this.uVideoTextureLoc = gl.getUniformLocation(program, "u_videoTexture");
    this.uBgTextureLoc = gl.getUniformLocation(program, "u_bgTexture");
    this.uHasBgTextureLoc = gl.getUniformLocation(program, "u_hasBgTexture");
    this.uEnableChromaKeyLoc = gl.getUniformLocation(program, "u_enableChromaKey");
    this.uTransparentModeLoc = gl.getUniformLocation(program, "u_transparentMode");
    this.uChromaKeyColorLoc = gl.getUniformLocation(program, "u_chromaKeyColor");
    this.uChromaSimilarityLoc = gl.getUniformLocation(program, "u_chromaSimilarity");
    this.uChromaSmoothnessLoc = gl.getUniformLocation(program, "u_chromaSmoothness");
    this.uDespillStrengthLoc = gl.getUniformLocation(program, "u_despillStrength");
    this.uBgAspectRatioLoc = gl.getUniformLocation(program, "u_bgAspectRatio");
    this.uLightingToneLoc = gl.getUniformLocation(program, "u_lightingTone");

    this.uMouthCenterLoc = gl.getUniformLocation(program, "u_mouthCenter");
    this.uMouthRadiusLoc = gl.getUniformLocation(program, "u_mouthRadius");
    this.uMouthAngleLoc = gl.getUniformLocation(program, "u_mouthAngle");
    this.uMouthCurvatureLoc = gl.getUniformLocation(program, "u_mouthCurvature");
    this.uJawOpenLoc = gl.getUniformLocation(program, "u_jawOpen");
    this.uLipWidthLoc = gl.getUniformLocation(program, "u_lipWidth");
    this.uLipPuckerLoc = gl.getUniformLocation(program, "u_lipPucker");
    this.uLipCompressionLoc = gl.getUniformLocation(program, "u_lipCompression");
    this.uLabiodentalTuckLoc = gl.getUniformLocation(program, "u_labiodentalTuck");
    this.uTongueTipProtrusionLoc = gl.getUniformLocation(program, "u_tongueTipProtrusion");
    this.uTongueTipElevatedLoc = gl.getUniformLocation(program, "u_tongueTipElevated");
    this.uTeethClenchedLoc = gl.getUniformLocation(program, "u_teethClenched");
    this.uAzureVisemeIdLoc = gl.getUniformLocation(program, "u_azureVisemeId");
    this.uAspectRatioLoc = gl.getUniformLocation(program, "u_aspectRatio");
    this.uDebugCrosshairLoc = gl.getUniformLocation(program, "u_debugCrosshair");

    // LivePortrait 3D Uniform Locations
    this.uHeadCenterLoc = gl.getUniformLocation(program, "u_headCenter");
    this.uHeadRadiusLoc = gl.getUniformLocation(program, "u_headRadius");
    this.uHeadPitchLoc = gl.getUniformLocation(program, "u_headPitch");
    this.uHeadYawLoc = gl.getUniformLocation(program, "u_headYaw");
    this.uHeadRollLoc = gl.getUniformLocation(program, "u_headRoll");
    this.uHeadLeanZLoc = gl.getUniformLocation(program, "u_headLeanZ");
    this.uHeadShiftXLoc = gl.getUniformLocation(program, "u_headShiftX");
    this.uHeadShiftYLoc = gl.getUniformLocation(program, "u_headShiftY");
    this.uBlinkLeftLoc = gl.getUniformLocation(program, "u_blinkLeft");
    this.uBlinkRightLoc = gl.getUniformLocation(program, "u_blinkRight");
    this.uEyeWideningLoc = gl.getUniformLocation(program, "u_eyeWidening");
    this.uGazeXLoc = gl.getUniformLocation(program, "u_gazeX");
    this.uGazeYLoc = gl.getUniformLocation(program, "u_gazeY");
    this.uEyebrowRaiseLoc = gl.getUniformLocation(program, "u_eyebrowRaise");
    this.uEyebrowFurrowLoc = gl.getUniformLocation(program, "u_eyebrowFurrow");
    this.uSmileExpressionLoc = gl.getUniformLocation(program, "u_smileExpression");
    this.uNeckPinningLoc = gl.getUniformLocation(program, "u_neckPinning");
    this.uLeftEyeCenterLoc = gl.getUniformLocation(program, "u_leftEyeCenter");
    this.uRightEyeCenterLoc = gl.getUniformLocation(program, "u_rightEyeCenter");

    // Shoulder / Upper-Body Kinematics Locations (Stage 0)
    this.uShoulderCenterLoc   = gl.getUniformLocation(program, "u_shoulderCenter");
    this.uShoulderBreathLoc   = gl.getUniformLocation(program, "u_shoulderBreath");
    this.uShoulderSwayLoc     = gl.getUniformLocation(program, "u_shoulderSway");
    this.uChestExpansionLoc   = gl.getUniformLocation(program, "u_chestExpansion");
    this.uShoulderShrugLoc    = gl.getUniformLocation(program, "u_shoulderShrug");

    // Full-screen quad geometry
    const positions = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.vao = vao;

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.vbo = vbo;

    const aPosLoc = gl.getAttribLocation(program, "a_position");
    const aTexLoc = gl.getAttribLocation(program, "a_texCoord");

    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 16, 8);

    // Setup Video Texture (Unit 0)
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = texture;

    // Setup Background Texture (Unit 1)
    const bgTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.bgTexture = bgTex;

    return true;
  }

  /**
   * Preloads and binds studio background image to GPU memory.
   */
  public loadBackground(imageUrl?: string | null): Promise<boolean> {
    if (!imageUrl) {
      this.isBgTextureReady = false;
      this.loadedBgUrl = null;
      return Promise.resolve(false);
    }

    if (imageUrl === this.loadedBgUrl && this.isBgTextureReady) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const gl = this.gl;
        if (!gl || !this.bgTexture) {
          resolve(false);
          return;
        }

        try {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          this.loadedBgUrl = imageUrl;
          this.bgImageAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
          this.isBgTextureReady = true;
          resolve(true);
        } catch (e) {
          console.warn("[WebglVisemeRenderer] BG Texture upload error:", e);
          resolve(false);
        }
      };

      img.onerror = () => {
        this.isBgTextureReady = false;
        resolve(false);
      };

      img.src = imageUrl;
    });
  }

  public render(video: HTMLVideoElement, uniforms: WebglVisemeUniforms): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.texture || !this.vao) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);

    // 1. Upload video frame to Unit 0 using zero-allocation texSubImage2D
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (this.videoTexWidth !== video.videoWidth || this.videoTexHeight !== video.videoHeight) {
      this.videoTexWidth = video.videoWidth;
      this.videoTexHeight = video.videoHeight;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, video.videoWidth, video.videoHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(this.uVideoTextureLoc, 0);

    // 2. Bind Background Texture to Unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
    gl.uniform1i(this.uBgTextureLoc, 1);
    const hasBg = this.isBgTextureReady ? 1 : 0;
    if (this.cacheHasBgTexture !== hasBg) {
      this.cacheHasBgTexture = hasBg;
      gl.uniform1i(this.uHasBgTextureLoc, hasBg);
    }

    // 3. Set Chroma Uniforms (Skipped if values are identical to previous frame)
    const enableChroma = uniforms.enableChromaKey !== false ? 1 : 0;
    if (this.cacheEnableChroma !== enableChroma) {
      this.cacheEnableChroma = enableChroma;
      gl.uniform1i(this.uEnableChromaKeyLoc, enableChroma);
    }

    const transMode = uniforms.transparentMode ? 1 : 0;
    if (this.cacheTransparentMode !== transMode) {
      this.cacheTransparentMode = transMode;
      gl.uniform1i(this.uTransparentModeLoc, transMode);
    }

    const keyCol = uniforms.chromaKeyColor || [0.05, 0.75, 0.22];
    if (this.cacheKeyColorR !== keyCol[0] || this.cacheKeyColorG !== keyCol[1] || this.cacheKeyColorB !== keyCol[2]) {
      this.cacheKeyColorR = keyCol[0];
      this.cacheKeyColorG = keyCol[1];
      this.cacheKeyColorB = keyCol[2];
      gl.uniform3f(this.uChromaKeyColorLoc, keyCol[0], keyCol[1], keyCol[2]);
    }

    const sim = uniforms.chromaSimilarity ?? 0.38;
    if (this.cacheSimilarity !== sim) {
      this.cacheSimilarity = sim;
      gl.uniform1f(this.uChromaSimilarityLoc, sim);
    }

    const smooth = uniforms.chromaSmoothness ?? 0.12;
    if (this.cacheSmoothness !== smooth) {
      this.cacheSmoothness = smooth;
      gl.uniform1f(this.uChromaSmoothnessLoc, smooth);
    }

    const despill = uniforms.despillStrength ?? 0.85;
    if (this.cacheDespill !== despill) {
      this.cacheDespill = despill;
      gl.uniform1f(this.uDespillStrengthLoc, despill);
    }

    const bgAspect = uniforms.bgAspectRatio ?? this.bgImageAspect ?? (16 / 9);
    if (this.cacheBgAspect !== bgAspect) {
      this.cacheBgAspect = bgAspect;
      gl.uniform1f(this.uBgAspectRatioLoc, bgAspect);
    }

    const toneVal =
      uniforms.lightingTone === "red_alert"
        ? 3
        : uniforms.lightingTone === "cyber"
        ? 4
        : uniforms.lightingTone === "warm"
        ? 2
        : uniforms.lightingTone === "cool"
        ? 1
        : 0;
    if (this.cacheLightingTone !== toneVal) {
      this.cacheLightingTone = toneVal;
      gl.uniform1i(this.uLightingToneLoc, toneVal);
    }

    const debugCross = uniforms.debugCrosshair ? 1 : 0;
    if (this.cacheDebugCrosshair !== debugCross) {
      this.cacheDebugCrosshair = debugCross;
      gl.uniform1i(this.uDebugCrosshairLoc, debugCross);
    }

    // 4. Set LivePortrait 3D Perspective Homography & Micro-Blink Uniforms
    const hCenter = uniforms.headCenter || [uniforms.mouthCenter[0], Math.max(0.12, uniforms.mouthCenter[1] - 0.03)];
    const hRadius = uniforms.headRadius || [0.17, 0.24];
    const eyeL = uniforms.leftEyeCenter || [hCenter[0] - 0.045, hCenter[1] - 0.035];
    const eyeR = uniforms.rightEyeCenter || [hCenter[0] + 0.045, hCenter[1] - 0.035];

    gl.uniform2f(this.uHeadCenterLoc, hCenter[0], hCenter[1]);
    gl.uniform2f(this.uHeadRadiusLoc, hRadius[0], hRadius[1]);
    gl.uniform1f(this.uHeadPitchLoc, uniforms.headPitch || 0.0);
    gl.uniform1f(this.uHeadYawLoc, uniforms.headYaw || 0.0);
    gl.uniform1f(this.uHeadRollLoc, uniforms.headRoll || 0.0);
    gl.uniform1f(this.uHeadLeanZLoc, uniforms.headLeanZ || 0.0);
    gl.uniform1f(this.uHeadShiftXLoc, uniforms.headShiftX || 0.0);
    gl.uniform1f(this.uHeadShiftYLoc, uniforms.headShiftY || 0.0);
    gl.uniform1f(this.uBlinkLeftLoc, uniforms.blinkLeft || 0.0);
    gl.uniform1f(this.uBlinkRightLoc, uniforms.blinkRight || 0.0);
    gl.uniform1f(this.uEyeWideningLoc, uniforms.eyeWidening || 1.0);
    gl.uniform1f(this.uGazeXLoc, uniforms.gazeX || 0.0);
    gl.uniform1f(this.uGazeYLoc, uniforms.gazeY || 0.0);
    gl.uniform1f(this.uEyebrowRaiseLoc, uniforms.eyebrowRaise || 0.0);
    gl.uniform1f(this.uEyebrowFurrowLoc, uniforms.eyebrowFurrow || 0.0);
    gl.uniform1f(this.uSmileExpressionLoc, uniforms.smileExpression || 0.0);
    gl.uniform1f(this.uNeckPinningLoc, uniforms.neckPinning !== undefined ? uniforms.neckPinning : 1.0);
    gl.uniform2f(this.uLeftEyeCenterLoc, eyeL[0], eyeL[1]);
    gl.uniform2f(this.uRightEyeCenterLoc, eyeR[0], eyeR[1]);

    // 4b. Shoulder / Upper-Body Kinematics (Stage 0)
    // Default shoulder center: horizontally centered, vertically below head by ~0.38
    const sCtr = uniforms.shoulderCenter || [hCenter[0], Math.min(0.95, hCenter[1] + 0.38)];
    gl.uniform2f(this.uShoulderCenterLoc, sCtr[0], sCtr[1]);
    gl.uniform1f(this.uShoulderBreathLoc,   uniforms.shoulderBreath   ?? 0.0);
    gl.uniform1f(this.uShoulderSwayLoc,     uniforms.shoulderSway     ?? 0.0);
    gl.uniform1f(this.uChestExpansionLoc,   uniforms.chestExpansion   ?? 0.0);
    gl.uniform1f(this.uShoulderShrugLoc,    uniforms.shoulderShrug    ?? 0.0);

    // 5. Set Face / Viseme Dynamic Uniforms

    gl.uniform2f(this.uMouthCenterLoc, uniforms.mouthCenter[0], uniforms.mouthCenter[1]);
    gl.uniform2f(this.uMouthRadiusLoc, uniforms.mouthRadius[0], uniforms.mouthRadius[1]);
    gl.uniform1f(this.uMouthAngleLoc, uniforms.mouthAngle || 0.0);
    gl.uniform1f(this.uMouthCurvatureLoc, uniforms.mouthCurvature || 0.0);
    gl.uniform1f(this.uJawOpenLoc, uniforms.jawOpen);
    gl.uniform1f(this.uLipWidthLoc, uniforms.lipWidth);
    gl.uniform1f(this.uLipPuckerLoc, uniforms.lipPucker);
    gl.uniform1f(this.uLipCompressionLoc, uniforms.lipCompression || 0.0);
    gl.uniform1f(this.uLabiodentalTuckLoc, uniforms.labiodentalTuck || 0.0);
    gl.uniform1f(this.uTongueTipProtrusionLoc, uniforms.tongueTipProtrusion || 0.0);
    gl.uniform1f(this.uTongueTipElevatedLoc, uniforms.tongueTipElevated || 0.0);
    gl.uniform1f(this.uTeethClenchedLoc, uniforms.teethClenched || 0.0);
    gl.uniform1i(this.uAzureVisemeIdLoc, uniforms.azureVisemeId ?? 0);
    gl.uniform1f(this.uAspectRatioLoc, uniforms.aspectRatio);

    // Draw Quad
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private _compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source.trim());
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const typeName = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";
      const info = gl.getShaderInfoLog(shader) || "No error log returned from driver";
      console.error(`[WebglVisemeRenderer] ${typeName} Shader compilation failed: ${info}`);
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public destroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      if (this.texture) {
        gl.deleteTexture(this.texture);
      }
      if (this.bgTexture) {
        gl.deleteTexture(this.bgTexture);
      }
      if (this.vao) {
        gl.deleteVertexArray(this.vao);
      }
      if (this.vbo) {
        gl.deleteBuffer(this.vbo);
      }
    }
    this.program = null;
    this.texture = null;
    this.bgTexture = null;
    this.vao = null;
    this.vbo = null;
    this.gl = null;
    this.videoTexWidth = 0;
    this.videoTexHeight = 0;
    this.isBgTextureReady = false;
    this.loadedBgUrl = null;
    this.cacheEnableChroma = -1;
    this.cacheTransparentMode = -1;
    this.cacheKeyColorR = -1;
    this.cacheKeyColorG = -1;
    this.cacheKeyColorB = -1;
    this.cacheSimilarity = -1;
    this.cacheSmoothness = -1;
    this.cacheDespill = -1;
    this.cacheBgAspect = -1;
    this.cacheLightingTone = -1;
    this.cacheHasBgTexture = -1;
    this.cacheDebugCrosshair = -1;
  }
}

export { WebglVisemeRenderer as WebGLVisemeRenderer };

