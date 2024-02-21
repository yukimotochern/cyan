export interface InfoConfig {
  format?: RegExp;
}

export type Info = Record<string, InfoConfig>;

export type OutputFunctionsCreator<InfoNames extends string> = (
  val: Record<InfoNames, string>,
) => Record<string, unknown>;

export type NamingBuilder<
  InfoNames extends string,
  OutputFuncs extends OutputFunctionsCreator<InfoNames>,
> = {
  [infoName in InfoNames]: (
    inputName: string,
  ) => NamingBuilder<InfoNames, OutputFuncs>;
} & {
  output: <OutputName extends keyof ReturnType<OutputFuncs>>(
    outputName: OutputName,
  ) => ReturnType<OutputFuncs>[Extract<OutputName, string>];
} & {
  get: (infoName: InfoNames) => string;
};

export type CreateNamingBuilder = <
  I extends Info,
  O extends OutputFunctionsCreator<Extract<keyof I, string>>,
>(config: {
  info: I;
  outputs: O;
}) => NamingBuilder<Extract<keyof I, string>, O>;

export const createNamingBuilder: CreateNamingBuilder = ({ info, outputs }) =>
  ({
    value: {},
    ...Object.fromEntries(
      Object.entries(info).map(([key, val]) => {
        if (['output', 'get'].includes(key)) {
          throw new Error(
            `\`output\`, \`get\` are reserved for special methods of naming builder. Replace property \`${key}\` of info object with other key when using createNamingBuilder.`,
          );
        }
        return [
          key,
          function (this: { value: Record<string, string> }, str: string) {
            const RFC1123_DOMAIN_NAME =
              /^(?![0-9]+$)(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/;
            const format = val.format || RFC1123_DOMAIN_NAME;
            if (!format.exec(str)) {
              throw new Error(
                `The input ${str} does not satisfy the constraint ${format}.`,
              );
            }
            return {
              ...this,
              value: {
                ...this.value,
                [key]: str,
              },
            };
          },
        ];
      }),
    ),
    output(this: { value: Record<string, string> }, str: string) {
      return outputs(this.value)[str];
    },
    get(this: { value: Record<string, string> }, str: string) {
      return this.value[str];
    },
  }) as never;

export const naming = createNamingBuilder({
  info: {
    organization: {},
    project: {},
    stack: {},
    service: {},
    component: {},
    resource: {},
    baseImageRegistry: {
      format:
        /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/,
    },
    imageVersion: {
      format: /^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$/,
    },
  },
  outputs({
    organization,
    project = '',
    stack = '',
    service = '',
    component = '',
    resource = '',
    baseImageRegistry = '',
    imageVersion = '',
  }) {
    function joinNonEmpty(strArr: string[], joinChar = '-') {
      return strArr.filter((s) => !!s).join(joinChar);
    }
    return {
      pulumiStackReference: joinNonEmpty([organization, project, stack], '/'),
      pulumiResourceName: joinNonEmpty([service, component, resource]),
      k8sNamespace: joinNonEmpty([project, stack, service]),
      k8sMetaName: joinNonEmpty([project, stack, service, component, resource]),
      k8sLabel: {
        'app.kubernetes.io/name': project,
        'app.kubernetes.io/component': joinNonEmpty([
          service,
          component,
          resource,
        ]),
        'app.kubernetes.io/managed-by': 'pulumi',
      },
      k8sContainerName: joinNonEmpty([component, resource]),
      dopplerProjectName: joinNonEmpty([project, service, component]),
      imageRegistry: `${baseImageRegistry}/${joinNonEmpty([
        project,
        stack,
        service,
        component,
        resource,
      ])}`,
      imageName: `${baseImageRegistry}/${joinNonEmpty([
        project,
        stack,
        service,
        component,
        resource,
      ])}:${imageVersion}`,
      awsTags: {
        ...(project && { project }),
        ...(stack && { stack }),
        ...(service && { service }),
      },
      doTags: [
        project && `project:${project}`,
        stack && `stack:${stack}`,
        service && `service:${service}`,
      ].filter((ob) => !!ob),
      nxProjectName: `${project}-${service}-${component}`,
    };
  },
});
export type GenericNamingBuilder = typeof naming;
