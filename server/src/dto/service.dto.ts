import { ServiceRunStatus, PackageManager } from '../services/services.service';

export class ServiceDto {
  name: string;
  appUrl: string;
  color: string;
  coverageBadge: string;
  pipelineBadge: string;
  pckgScripts: string[];
  gitUrl: string;
  packageManager: PackageManager;
  tasks: TaskDto[];
  rootPath?: string;
  relativePath?: string;
  isMonorepoRoot?: boolean;
  isMonorepoChild?: boolean;
  isServer?: boolean;
}

export class TaskDto {
  name: string;
  color: string;
  icon: string;
  runIfNotCloned: boolean;
  runIfRunStatusIs: ServiceRunStatus[];
  serverOnly?: boolean;
  label?: string;
  dedicatedColumn?: boolean;
}

export class ServicesDto {
  services: ServiceDto[];
}
