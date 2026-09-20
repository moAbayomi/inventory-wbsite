import { app } from "./server.ts";
import { env } from "../env.ts";

// env.PORT already falls back to 3000 locally (see env.ts) -- this just
// stops ignoring whatever a host actually assigns.
app.listen(env.PORT, () => {
  console.log(`app listening on port: http://localhost:${env.PORT}`);
});
