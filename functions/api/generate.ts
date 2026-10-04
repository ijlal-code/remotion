// Cloudflare Pages Function: POST /api/generate
import { handleGenerate, type ServerEnv } from '../../server/handler'

export const onRequest = ({ request, env }: { request: Request; env: ServerEnv }) =>
  handleGenerate(request, env)
