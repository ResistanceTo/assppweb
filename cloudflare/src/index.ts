import { Container } from '@cloudflare/containers';

const containerEnvKeys = [
  'PUBLIC_BASE_URL',
  'UNSAFE_DANGEROUSLY_DISABLE_HTTPS_REDIRECT',
  'AUTO_CLEANUP_DAYS',
  'AUTO_CLEANUP_MAX_MB',
  'MAX_DOWNLOAD_MB',
  'DOWNLOAD_THREADS',
  'ACCESS_PASSWORD',
] as const;

type ContainerEnvKey = (typeof containerEnvKeys)[number];

const defaultContainerEnv = {
  DATA_DIR: '/data',
  NODE_ENV: 'production',
  PORT: '8080',
};

export class AssppContainer extends Container {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = '30m';
  enableInternet = true;
  pingEndpoint = '/api/settings';
  envVars = defaultContainerEnv;
}

type Env = {
  ASPP_CONTAINER: ContainerNamespace;
  CONTAINER_INSTANCE_NAME?: string;
} & Partial<Record<ContainerEnvKey, string>>;

interface StartAndWaitForPortsOptions {
  startOptions?: {
    envVars?: Record<string, string>;
  };
}

interface ContainerInstance {
  fetch(request: Request): Promise<Response>;
  startAndWaitForPorts(options?: StartAndWaitForPortsOptions): Promise<void>;
}

interface ContainerNamespace {
  getByName(name: string): ContainerInstance;
}

function getContainerEnvVars(env: Env): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const key of containerEnvKeys) {
    const value = env[key];
    if (typeof value === 'string') {
      vars[key] = value;
    }
  }

  return vars;
}

function withForwardHeaders(request: Request): Request {
  const headers = new Headers(request.headers);
  if (!headers.has('x-forwarded-proto')) {
    // Default to HTTPS when the header is missing to avoid local dev redirects.
    headers.set('x-forwarded-proto', 'https');
  }
  return new Request(request, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const containerName = env.CONTAINER_INSTANCE_NAME?.trim() || 'main';
    const container = env.ASPP_CONTAINER.getByName(containerName);
    await container.startAndWaitForPorts({
      startOptions: {
        envVars: {
          ...defaultContainerEnv,
          ...getContainerEnvVars(env),
        },
      },
    });
    return container.fetch(withForwardHeaders(request));
  },
};
