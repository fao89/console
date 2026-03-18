// Clean workflow-specific OLS button components

import type { FC } from 'react';
import UpdateWorkflowOLSButton from './UpdateWorkflowOLSButton';
import { ClusterUpdateStatus } from '../../module/k8s';
import { RECENT_UPDATE_WINDOW } from '../../utils/ols-integration';

interface WorkflowButtonProps {
  cv: any; // ClusterVersionKind
}

export const SuccessOLSButton: FC<WorkflowButtonProps & { status: ClusterUpdateStatus }> = ({
  cv,
  status,
}) => {
  const lastUpdate = cv.status?.history?.[0];
  const isRecentUpdate =
    lastUpdate?.state === 'Completed' &&
    lastUpdate?.completionTime &&
    new Date(lastUpdate.completionTime) > new Date(Date.now() - RECENT_UPDATE_WINDOW);

  const shouldShow = isRecentUpdate && status === ClusterUpdateStatus.UpToDate;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="pf-v6-u-mt-sm">
      <UpdateWorkflowOLSButton phase="success" cv={cv} />
    </div>
  );
};

export const FailureOLSButton: FC<WorkflowButtonProps & { status: ClusterUpdateStatus }> = ({
  cv,
  status,
}) => {
  const shouldShow =
    status === ClusterUpdateStatus.Failing ||
    status === ClusterUpdateStatus.UpdatingAndFailing ||
    status === ClusterUpdateStatus.ErrorRetrieving;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="pf-v6-u-mt-sm">
      <UpdateWorkflowOLSButton phase="failure" cv={cv} />
    </div>
  );
};

export const StatusOLSButton: FC<WorkflowButtonProps> = ({ cv }) => {
  return (
    <div className="pf-v6-u-mt-md pf-v6-u-text-align-center">
      <UpdateWorkflowOLSButton phase="status" cv={cv} />
    </div>
  );
};

export const PrecheckOLSButton: FC<WorkflowButtonProps & { hasAvailableUpdates: boolean }> = ({
  cv,
  hasAvailableUpdates,
}) => {
  if (!hasAvailableUpdates) {
    return null;
  }

  return (
    <div className="pf-v6-u-mb-sm pf-v6-u-text-align-center">
      <UpdateWorkflowOLSButton phase="precheck" cv={cv} />
    </div>
  );
};
