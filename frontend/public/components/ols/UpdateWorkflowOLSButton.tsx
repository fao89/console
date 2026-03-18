// Clean OLS button component using consolidated utilities

import type { FC } from 'react';
import { Button } from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { useExtensions } from '@console/plugin-sdk/src/api/useExtensions';

import { useFlag } from '@console/shared/src/hooks/useFlag';
import { useTelemetry } from '@console/shared/src/hooks/useTelemetry';

// OLS utilities and business logic imports
import type { UpdateWorkflowOLSButtonProps } from '../../utils/ols-integration';
import {
  useOLSAutoSubmit,
  createWorkflowAttachments,
  TELEMETRY_EVENTS,
} from '../../utils/ols-integration';
import { generateUpdatePrompt, getButtonText } from './ols-prompts';

import {
  getLastCompletedUpdate,
  getDesiredClusterVersion,
  getClusterUpdateStatus,
} from '../../module/k8s';
import { isManaged } from '../utils/documentation';

const UpdateWorkflowOLSButton: FC<UpdateWorkflowOLSButtonProps> = ({ phase, cv, className }) => {
  const { t } = useTranslation();
  const isOLSAvailable = useFlag('LIGHTSPEED_CONSOLE');
  const fireTelemetryEvent = useTelemetry();
  const { openOLSWithPrompt } = useOLSAutoSubmit();

  // Find the OLS extension provided by lightspeed-console plugin
  const [olsExtension] = useExtensions<any>(
    (e): e is any =>
      e.type === 'console.action/provider' && e.properties?.contextId === 'ols-open-handler',
  );

  // Don't render if OLS is not available
  // In development, allow rendering without real extension for chat modal fallback
  const shouldRender = isOLSAvailable && (olsExtension || process.env.NODE_ENV === 'development');

  if (!shouldRender) {
    return null;
  }

  // Helper functions for data processing
  const getCurrentVersionSafe = () => getLastCompletedUpdate(cv);
  const getDesiredVersionSafe = () => getDesiredClusterVersion(cv);
  const getUpdateStatus = () => getClusterUpdateStatus(cv);

  const handleClick = async () => {
    const context = {
      currentVersion: getCurrentVersionSafe(),
      desiredVersion: getDesiredVersionSafe(),
      status: getUpdateStatus(),
      environment: isManaged() ? 'managed' : 'self-managed',
      updateChannel: cv.spec?.channel || 'unknown',
      cv,
    };

    const prompt = generateUpdatePrompt(phase, context);
    const attachments = createWorkflowAttachments(phase, cv);

    openOLSWithPrompt(prompt, attachments);

    // Track usage by workflow phase with ClusterVersion context only
    fireTelemetryEvent(TELEMETRY_EVENTS.olsButtonClicked, {
      source: 'cluster-settings',
      updatePhase: phase,
      clusterVersion: getCurrentVersionSafe(),
      updateStatus: getUpdateStatus(),
      environment: context.environment,
      updateChannel: context.updateChannel,
      attachmentCount: attachments.length,
    });
  };

  return (
    <Button
      variant="link"
      size="sm"
      onClick={handleClick}
      icon={<MagicIcon />}
      iconPosition="start"
      className={className}
      data-test={`ols-update-${phase}`}
      aria-label={getButtonText(phase, t)}
    >
      {getButtonText(phase, t)}
    </Button>
  );
};

export default UpdateWorkflowOLSButton;
