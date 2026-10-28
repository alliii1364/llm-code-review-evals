// Creates a new task. Every task should start with its own empty tag list.
const DEFAULT_TASK = { status: "open", tags: [] as string[] };

export function createTask(title: string, extraTag?: string) {
  const task = { ...DEFAULT_TASK, title };
  if (extraTag) task.tags.push(extraTag);
  return task;
}
