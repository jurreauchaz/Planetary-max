export type TaskState = 'queued' | 'running' | 'completed' | 'failed';
export interface IsolatedTask<T> { id: string; state: TaskState; run: () => Promise<T> }

export async function executeTask<T>(task: IsolatedTask<T>): Promise<{ id: string; state: TaskState; result?: T }> {
  if (task.state !== 'queued') throw new Error('Only queued tasks can run');
  task.state = 'running';
  try {
    const result = await task.run();
    task.state = 'completed';
    return { id: task.id, state: task.state, result };
  } catch (error) {
    task.state = 'failed';
    throw error;
  }
}
