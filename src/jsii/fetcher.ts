import { Readable } from "stream";
import gunzip from "gunzip-maybe";
import { tarball } from "pacote";
// import registryUrl from "registry-url";
import { extract } from "tar-stream";

async function getRegistryUrl(scope: string | undefined) {
  const registryUrl = await import("registry-url");
  const url = registryUrl.default(scope);
  return url;
}
export interface RemoteProjenProjectInfo {
  typeName: string;
  pjid?: string;
  summary?: string;
}

// This function is partially taken projen, but made a bit worse to speed it up
function isProjectType(jsiiTypes: any, fqn: string) {
  const type = jsiiTypes[fqn];

  if (!type) {
    throw new Error(
      `Could not find project type with fqn "${fqn}" in  .jsii file.`
    );
  }

  if (type.kind !== "class") {
    return false;
  }
  if (type.abstract) {
    return false;
  }

  if (type.docs?.deprecated) {
    return false;
  }

  if (type.docs?.custom?.pjid) {
    return true;
  }

  let curr = type;
  while (true) {
    const lastBase = curr.base;

    if (curr.fqn === "projen.Project") {
      return true;
    }

    if (!lastBase) {
      return curr.fqn.startsWith("projen.") && curr.fqn.endsWith("Project");
    }

    curr = jsiiTypes[lastBase];
    if (!curr) {
      return lastBase.startsWith("projen.") && lastBase.endsWith("Project");
    }
  }
}

// TODO
// Probably need better handling of the streams, but honestly I'm not sure
export async function getProjectIds(
  spec: string
): Promise<RemoteProjenProjectInfo[]> {
  const jsiiManifest = await getJSII(spec);
  if (jsiiManifest && jsiiManifest.types) {
    return Object.keys(jsiiManifest.types)
      .filter((fqn: string) => isProjectType(jsiiManifest.types, fqn))
      .map((fqn: string) => {
        const t = jsiiManifest.types[fqn];
        return {
          pjid: t.docs?.custom?.pjid,
          summary: t.docs?.summary,
          typeName: t.name,
        };
      });
  }

  return [];
}

export async function getJSII(spec: string): Promise<any> {
  return new Promise(async (resolve, _reject) => {
    let scope;
    if (spec.startsWith("@")) {
      scope = spec.split("/")[0];
    }

    const tarballData = await tarball(spec, {
      // registry: registryUrl(scope),
      registry: await getRegistryUrl(scope),
    });

    const tarballStream = new Readable();
    tarballStream._read = () => {}; // _read is required but you can noop it
    tarballStream.push(tarballData);
    tarballStream.push(null);

    var extractPipe = extract();

    let allChunks = "";
    const returnChunks = () => {
      if (allChunks) {
        resolve(JSON.parse(allChunks));
      } else {
        resolve(null);
      }
    };

    extractPipe
      .on("entry", function (header, stream, next) {
        if (header.name == "package/.jsii") {
          stream.setEncoding("utf8");

          stream.on("data", function (chunk) {
            allChunks += chunk.toString();
          });
          stream.on("end", function () {
            extractPipe.destroy();
            tarballStream.destroy();
          });
        } else {
          stream.on("end", function () {
            next();
          });
        }

        stream.resume();
      })
      .on("end", returnChunks)
      .on("close", returnChunks);

    tarballStream.pipe(gunzip()).pipe(extractPipe).on("close", returnChunks);
  });
}
