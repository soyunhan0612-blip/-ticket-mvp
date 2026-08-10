import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// The default findBy*/waitFor timeout is 1000ms, which the full suite exceeds
// on loaded machines even though each file passes in isolation.
configure({ asyncUtilTimeout: 5000 });

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
