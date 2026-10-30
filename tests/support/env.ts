// Points every test at the local test database with a local-only key,
// overriding anything loaded from .env.
import { localEnv, LOCAL_DB } from "../../scripts/local-env-config.mjs";

Object.assign(process.env, localEnv(LOCAL_DB.testDatabase));
