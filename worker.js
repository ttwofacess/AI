/* import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/+esm" */
import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm"

const handler = new WebWorkerMLCEngineHandler()

self.onmessage = (msg) => {
  handler.onmessage(msg)
}