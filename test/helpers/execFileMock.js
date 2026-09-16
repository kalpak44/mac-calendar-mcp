import { promisify } from "node:util";

// calendar.js binds `promisify(execFile)` at module load, and promisify reads the custom
// symbol. Without it the promise resolves with stdout alone, so calendar.js's `{ stdout }`
// destructure yields undefined and the tests pass against garbage.
export function createExecFileMock() {
  const calls = [];
  let impl = async () => ({ stdout: "[]", stderr: "" });

  const execFile = function execFile() {
    throw new Error("callback form is not used by calendar.js");
  };

  execFile[promisify.custom] = async (file, args, options) => {
    calls.push({ file, args, options });
    return impl(file, args, options);
  };

  return {
    execFile,
    calls,
    setImpl(next) {
      impl = next;
    },
    lastArgs() {
      return calls.at(-1)?.args ?? [];
    }
  };
}
