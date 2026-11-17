// Canonical Hono router; src/worker.ts exports this application.
import app from './server/planetary-max';
import nativeSettlement from './server/native-settlement';
import marketplace from './server/marketplace';

export type { Bindings as Env } from './server/types';

app.route('/', nativeSettlement);
app.route('/', marketplace);

export { NodeRegistryDO, BEEMAXSecureNodeRegistryDO } from './server/planetary-max';
export default app;
