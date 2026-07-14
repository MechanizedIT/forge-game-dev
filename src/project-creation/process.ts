import { spawnSync } from "node:child_process";

export interface ProcessRequest {
  executable: string;
  args: string[];
  cwd: string;
}

export interface ProcessResult {
  status: number;
  output: string;
}

export type ProjectProcessRunner = (request: ProcessRequest) => ProcessResult;

export const runProjectProcess: ProjectProcessRunner = ({ executable, args, cwd }) => {
  const result = spawnSync(executable, args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};
