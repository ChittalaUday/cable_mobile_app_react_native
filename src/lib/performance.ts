import { getApp } from '@react-native-firebase/app';
import { getPerformance, trace } from '@react-native-firebase/perf';

const performance = getPerformance(getApp());

/**
 * Network requests and app-start time are traced automatically. Use this for custom traces
 * around a specific flow (e.g. checkout, a heavy screen render).
 */
export async function withPerformanceTrace<T>(name: string, run: () => Promise<T>): Promise<T> {
  const customTrace = trace(performance, name);
  customTrace.start();
  try {
    return await run();
  }
  finally {
    customTrace.stop();
  }
}
