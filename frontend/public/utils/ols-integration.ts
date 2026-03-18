// OLS utilities - reusable functions and types only
// Business logic moved to components/ols/ files

import { useCallback } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface WindowWithOLS extends Window {
  openOLS?: (prompt: string, attachments: OLSAttachment[]) => void;
  lightspeed?: {
    openOLS?: (prompt: string, attachments: OLSAttachment[]) => void;
  };
}

export interface OLSAttachment {
  attachmentType: 'YAML';
  kind: string;
  name: string;
  namespace: undefined;
  value: string;
}

export type WorkflowPhase = 'precheck' | 'failure' | 'status' | 'success';

export interface UpdateWorkflowOLSButtonProps {
  phase: WorkflowPhase;
  cv: any; // ClusterVersionKind
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const OLS_MODAL_DELAY = 500; // ms to wait for modal to open
export const SUBMIT_DELAY = 10; // ms to wait before auto-submit
export const RECENT_UPDATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in ms

export const OLS_SELECTORS = {
  button: '[data-test*="ols"], [aria-label*="Lightspeed"], .ols-button',
  textarea: 'textarea[placeholder*="message"], textarea[placeholder*="prompt"]',
  sendButton: 'pf-chatbot__button--send',
} as const;

export const TELEMETRY_EVENTS = {
  olsButtonClicked: 'OLS Update Workflow Button Clicked',
} as const;

// ============================================================================
// DATA PROCESSING UTILITIES
// ============================================================================

export const getPreUpdateClusterVersionSubset = (cv: any) => ({
  metadata: {
    name: cv.metadata?.name,
    creationTimestamp: cv.metadata?.creationTimestamp,
  },
  spec: {
    channel: cv.spec?.channel,
    clusterID: cv.spec?.clusterID,
    desiredUpdate: cv.spec?.desiredUpdate,
    upstream: cv.spec?.upstream,
  },
  status: {
    desired: cv.status?.desired,
    conditions: cv.status?.conditions,
    availableUpdates: cv.status?.availableUpdates,
    conditionalUpdates: cv.status?.conditionalUpdates,
    observedGeneration: cv.status?.observedGeneration,
  },
});

export const getPostUpdateClusterVersionSubset = (cv: any) => ({
  metadata: {
    name: cv.metadata?.name,
  },
  spec: {
    channel: cv.spec?.channel,
    clusterID: cv.spec?.clusterID,
  },
  status: {
    desired: cv.status?.desired,
    history: cv.status?.history?.slice(0, 2), // Just last 2 updates
    conditions: cv.status?.conditions?.filter((c: any) =>
      ['Available', 'Progressing', 'Failing'].includes(c.type),
    ),
    observedGeneration: cv.status?.observedGeneration,
  },
});

export const getMidUpdateClusterVersionSubset = (cv: any) => ({
  metadata: {
    name: cv.metadata?.name,
  },
  spec: {
    channel: cv.spec?.channel,
    clusterID: cv.spec?.clusterID,
  },
  status: {
    desired: cv.status?.desired,
    history: cv.status?.history?.slice(0, 1), // Current update attempt
    conditions: cv.status?.conditions, // Full conditions for NLP analysis
    observedGeneration: cv.status?.observedGeneration,
  },
});

export const calculateUpdateDuration = (startTime?: string, endTime?: string): string | null => {
  if (!startTime || !endTime) {
    return null;
  }
  const duration = Math.round(
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
  );
  return duration > 0 ? `${duration} minutes` : null;
};

export const createWorkflowAttachments = (phase: WorkflowPhase, cv: any): OLSAttachment[] => {
  const getAttachmentData = () => {
    switch (phase) {
      case 'precheck':
        return {
          name: 'pre-update-cluster-version',
          value: JSON.stringify(getPreUpdateClusterVersionSubset(cv), null, 2),
        };
      case 'failure':
        return {
          name: 'failure-cluster-version',
          value: JSON.stringify(getMidUpdateClusterVersionSubset(cv), null, 2),
        };
      case 'status':
        return {
          name: 'status-cluster-version',
          value: JSON.stringify(getMidUpdateClusterVersionSubset(cv), null, 2),
        };
      case 'success':
        return {
          name: 'success-cluster-version',
          value: JSON.stringify(getPostUpdateClusterVersionSubset(cv), null, 2),
        };
      default:
        return { name: 'cluster-version', value: '{}' };
    }
  };

  const { name, value } = getAttachmentData();
  return [
    {
      attachmentType: 'YAML' as const,
      kind: 'ClusterVersion',
      name,
      namespace: undefined,
      value,
    },
  ];
};

// ============================================================================
// DOM MANIPULATION HOOK
// ============================================================================

export const useOLSAutoSubmit = () => {
  const populateAndSubmitPrompt = useCallback((prompt: string) => {
    const textarea = document.querySelector(OLS_SELECTORS.textarea) as HTMLTextAreaElement;
    if (!textarea) {
      return;
    }

    // Use React's synthetic event system to properly update state
    textarea.focus();

    // Set the value using React's approach
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, prompt);
    } else {
      textarea.value = prompt;
    }

    // Create and dispatch React synthetic events
    const inputEvent = new Event('input', {
      bubbles: true,
      cancelable: true,
    });

    // Add React-specific properties to the event
    Object.defineProperty(inputEvent, 'target', {
      writable: false,
      value: textarea,
    });

    Object.defineProperty(inputEvent, 'currentTarget', {
      writable: false,
      value: textarea,
    });

    // Dispatch the synthetic input event
    textarea.dispatchEvent(inputEvent);

    // Also trigger change event
    const changeEvent = new Event('change', {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(changeEvent, 'target', {
      writable: false,
      value: textarea,
    });

    textarea.dispatchEvent(changeEvent);

    // Auto-submit immediately to prevent prompt from vanishing
    if (prompt && prompt.trim().length > 0) {
      setTimeout(() => {
        // Find the send button
        const sendButton = document.getElementsByClassName(
          OLS_SELECTORS.sendButton,
        )[0] as HTMLButtonElement;

        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        } else if (sendButton && sendButton.disabled) {
          sendButton.disabled = false;
          sendButton.click();
        }
      }, SUBMIT_DELAY);
    }
  }, []);

  const openOLSWithPrompt = useCallback(
    (prompt: string, attachments: OLSAttachment[] = []) => {
      try {
        // Check if there's a global OLS function
        const windowWithOLS = window as WindowWithOLS;
        const globalOLS = windowWithOLS.openOLS || windowWithOLS.lightspeed?.openOLS;

        if (globalOLS && typeof globalOLS === 'function') {
          globalOLS(prompt, attachments);
          return;
        }

        // Fallback - try to find and click an existing OLS button
        const olsButton = document.querySelector(OLS_SELECTORS.button);
        if (olsButton) {
          (olsButton as HTMLElement).click();

          // Wait for modal to open then populate and submit
          setTimeout(() => {
            populateAndSubmitPrompt(prompt);
          }, OLS_MODAL_DELAY);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in OLS auto-submit:', error);
      }
    },
    [populateAndSubmitPrompt],
  );

  return { openOLSWithPrompt };
};
