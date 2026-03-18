import { compact, uniq } from 'lodash';
import { getURLSearchParams } from '@console/internal/components/utils/link';

const getEnabledDynamicPluginNames = () => {
  const allPluginNames = window.SERVER_FLAGS.consolePlugins || [];
  const disabledPlugins = getURLSearchParams()['disable-plugins'];

  // Development override: Add lightspeed plugin if not present
  const devPluginNames =
    process.env.NODE_ENV === 'development' && !allPluginNames.includes('lightspeed-console-plugin')
      ? [...allPluginNames, 'lightspeed-console-plugin']
      : allPluginNames;

  if (disabledPlugins === '') {
    return [];
  }

  if (!disabledPlugins) {
    return devPluginNames;
  }

  const disabledPluginNames = compact(disabledPlugins.split(','));

  return uniq(devPluginNames).filter((pluginName) => !disabledPluginNames.includes(pluginName));
};

/**
 * List of dynamic plugin names from {@link window.SERVER_FLAGS} and URL params to be loaded by Console.
 *
 * Note: this also determines the order of extensions returned from Console plugin SDK hooks
 * like `useExtensions` and `useResolvedExtensions`.
 */
export const dynamicPluginNames = getEnabledDynamicPluginNames();
