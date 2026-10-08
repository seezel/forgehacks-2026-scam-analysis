import {
  loadExamples,
  loadSafeActions,
  loadScamTypes,
} from "../lib/scam-data";

try {
  const profiles = loadScamTypes();
  const examples = loadExamples();
  const actions = loadSafeActions();

  console.log(
    `Validated scam profiles (${profiles.length}): ${profiles.map((item) => item.id).join(", ")}`,
  );
  console.log(
    `Validated documented examples (${examples.length}): ${examples.map((item) => item.id).join(", ")}`,
  );
  console.log(
    `Validated safety actions (${actions.length}): ${actions.map((item) => item.id).join(", ")}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown data error";
  console.error(`Data validation failed: ${message}`);
  process.exitCode = 1;
}
