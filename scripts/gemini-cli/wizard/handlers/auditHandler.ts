/**
 * scripts/gemini-cli/wizard/handlers/auditHandler.ts
 */

import prompts from "prompts";
import { runAuditHarness } from "../../auditHarness";

export async function handleAuditWorkflow(): Promise<boolean> {
  const auditTargetRes = await prompts({
    type: "select",
    name: "targetType",
    message: "Select Audit Target Scope:",
    choices: [
      { title: "📁 Audit Default Composited Scenes Directory (public/studio_environments/composited_scenes/)", value: "default_dir" },
      { title: "🖼️ Audit a Specific Single Image File", value: "single_file" },
      { title: "🗄️ Audit Master Images Registered in Database", value: "database" },
    ],
  });

  let imagePath: string | undefined;
  let dirPath: string | undefined;
  let auditDb: boolean | undefined;

  if (auditTargetRes.targetType === "single_file") {
    const fileRes = await prompts({
      type: "text",
      name: "path",
      message: "Enter image file path to audit:",
      initial: "public/studio_environments/composited_scenes/blaze_cam1_center_wide_blaze_gold_halter_leather_mini_342158.jpg",
    });
    imagePath = fileRes.path;
  } else if (auditTargetRes.targetType === "database") {
    auditDb = true;
  } else {
    dirPath = "public/studio_environments/composited_scenes";
  }

  await runAuditHarness({
    imagePath,
    dirPath,
    auditDb,
  });

  return true;
}
