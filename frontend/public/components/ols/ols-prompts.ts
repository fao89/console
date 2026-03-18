// OLS-specific business logic for prompt generation
// This is workflow-specific logic, not reusable utilities

import type { WorkflowPhase } from '../../utils/ols-integration';
import { calculateUpdateDuration } from '../../utils/ols-integration';

interface PromptContext {
  currentVersion: string;
  desiredVersion: string;
  status: string;
  environment: string;
  updateChannel: string;
  cv: any;
}

export const generateUpdatePrompt = (phase: WorkflowPhase, context: PromptContext): string => {
  const { currentVersion, desiredVersion, status, environment, updateChannel, cv } = context;

  switch (phase) {
    case 'precheck': {
      const availableUpdates = cv.status?.availableUpdates || [];
      const targetVersion = availableUpdates[0]?.version;
      const recentFailures =
        cv.status?.history?.slice(0, 5).filter((h: any) => h.state !== 'Completed').length || 0;

      return `I'm planning to update my ${environment} OpenShift cluster from ${currentVersion} to ${targetVersion} via ${updateChannel} channel.

Recent update history shows ${recentFailures} non-successful attempts in the last 5 updates.

Please provide comprehensive pre-update guidance including:
1. Specific prerequisites and compatibility checks for this version jump
2. Resource requirements and capacity planning
3. Backup and rollback strategies
4. Risk assessment based on the cluster configuration in the attached data
5. Estimated update duration and maintenance window planning
6. Any known issues or breaking changes for this update path

Focus on actionable steps I should take before starting the update. Use the attached ClusterVersion data to assess current cluster state and readiness.`;
    }

    case 'failure': {
      const failureConditions =
        cv.status?.conditions?.filter(
          (c: any) => c.type === 'Failing' || (c.type === 'Progressing' && c.status === 'False'),
        ) || [];

      const updateStartTime = cv.status?.history?.find((h: any) => h.version === desiredVersion)
        ?.startedTime;
      const failureDuration = updateStartTime
        ? Math.round((Date.now() - new Date(updateStartTime).getTime()) / 60000)
        : null;

      return `My ${environment} OpenShift cluster update has failed.

Update Details:
- From: ${currentVersion} to ${desiredVersion}
- Channel: ${updateChannel}
- Status: ${status}
${failureDuration ? `- Failed after: ${failureDuration} minutes` : ''}

Key failure conditions:
${failureConditions
  .map((c: any) => `- ${c.type}: ${c.message || c.reason || 'No details available'}`)
  .join('\n')}

Please analyze the attached ClusterVersion conditions and help me:
1. Analyze the root cause of this update failure
2. Provide step-by-step troubleshooting guidance
3. Suggest remediation actions to resolve the issues
4. Advise on safe recovery or rollback options if needed
5. Recommend preventive measures for future updates

Use natural language processing on the condition messages to understand what components may need attention. Request specific resource data if you need to investigate particular operators, nodes, or machine config pools.`;
    }

    case 'status': {
      const progressCondition = cv.status?.conditions?.find((c: any) => c.type === 'Progressing');
      const updateStartTime = cv.status?.history?.find((h: any) => h.version === desiredVersion)
        ?.startedTime;
      const currentDuration = updateStartTime
        ? Math.round((Date.now() - new Date(updateStartTime).getTime()) / 60000)
        : null;

      return `My ${environment} OpenShift cluster is currently updating from ${currentVersion} to ${desiredVersion}.

Update Details:
- Channel: ${updateChannel}
- Status: ${status}
${currentDuration ? `- Duration so far: ${currentDuration} minutes` : ''}

Current Progress: ${progressCondition?.message || 'Update in progress'}

Please analyze the attached ClusterVersion data and help me:
1. Assess if the update is progressing normally
2. Identify any potential issues or bottlenecks from the condition messages
3. Provide guidance on expected timeline and next steps
4. Advise on monitoring best practices during the update
5. Suggest actions if the update appears stuck or slow

Use the condition messages to understand the current state and request specific component data if needed for deeper analysis.`;
    }

    case 'success': {
      const completedUpdate = cv.status?.history?.find(
        (h: any) => h.state === 'Completed' && h.version === currentVersion,
      );
      const updateDuration = completedUpdate
        ? calculateUpdateDuration(completedUpdate.startedTime, completedUpdate.completionTime)
        : null;

      return `My ${environment} OpenShift cluster has successfully updated to version ${currentVersion}.

Update Details:
- Previous version: ${cv.status?.history?.[1]?.version || 'unknown'}
- Channel: ${updateChannel}
- Duration: ${updateDuration || 'unknown'}
- Completed: ${completedUpdate?.completionTime || 'unknown'}

Please review the attached ClusterVersion data and help me:
1. Verify the update completed successfully
2. Recommend post-update validation steps
3. Guide me through cluster health checks
4. Suggest any needed configuration updates
5. Advise on monitoring for post-update issues

Focus on what I can validate from the ClusterVersion status and what additional component checks you recommend.`;
    }

    default:
      return `I need help with my ${environment} OpenShift cluster update workflow.`;
  }
};

export const getButtonText = (phase: WorkflowPhase, t: (key: string) => string): string => {
  switch (phase) {
    case 'precheck':
      return t('public~Ask Lightspeed about update prerequisites');
    case 'failure':
      return t('public~Ask Lightspeed about update failures');
    case 'status':
      return t('public~Ask Lightspeed about update progress');
    case 'success':
      return t('public~Ask Lightspeed about update verification');
    default:
      return t('public~Ask Lightspeed');
  }
};
