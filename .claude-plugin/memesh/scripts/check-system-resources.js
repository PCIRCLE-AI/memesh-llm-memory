import os from "os";

const bytesToGb = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(1);

const totalMem = os.totalmem();
const freeMem = os.freemem();
const cpuCount = os.cpus().length;
const load = os.loadavg().map((value) => value.toFixed(2)).join(", ");

console.log("System resources:");
console.log(`- CPUs: ${cpuCount}`);
console.log(`- Memory: ${bytesToGb(freeMem)} GB free / ${bytesToGb(totalMem)} GB total`);
console.log(`- Load avg (1m, 5m, 15m): ${load}`);

const warnings = [];
if (totalMem < 4 * 1024 * 1024 * 1024) {
  warnings.push("Recommended memory is 4 GB or more for best performance.");
}
if (freeMem < 1024 * 1024 * 1024) {
  warnings.push("Low free memory detected. Close unused apps if you see slowdowns.");
}

if (warnings.length > 0) {
  console.log("");
  console.log("Resource notes:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
