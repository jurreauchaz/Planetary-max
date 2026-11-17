// Canonical Hono router; src/worker.ts exports this application.
import app from './server/planetary-max';
import nativeSettlement from './server/native-settlement';

app.route('/', nativeSettlement);

export { NodeRegistryDO, BEEMAXSecureNodeRegistryDO } from './server/planetary-max';
export default app;
