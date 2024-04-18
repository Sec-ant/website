import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const CACHE_WASM_PATH = resolve("../../../../biome/packages/@biomejs/wasm-web");
const SUBMODULE_LOCK_PATH = resolve("submodule.lock");
const SKIP_WASM_BUILD_FILE_PATH = resolve("../../../../skip_wasm_build");

export const onPreBuild = async ({ utils }) => {
	if (await utils.cache.restore(SUBMODULE_LOCK_PATH)) {
		const prevSubmoduleLock = await readFile(SUBMODULE_LOCK_PATH, {
			encoding: "utf8",
		});
		console.log(`Prev Submodule Lock: ${prevSubmoduleLock}`);
		const currSubmoduleLock = await generateLockFile();
		console.log(`Curr Submodule Lock: ${currSubmoduleLock}`);
		if (currSubmoduleLock === prevSubmoduleLock) {
			console.log("Submodule is not updated");
			console.log("Started restoring WASM cache");
			console.log(`Cache WASM Path: ${CACHE_WASM_PATH}`);
			const restoreStatus = await utils.cache.restore(CACHE_WASM_PATH);
			if (restoreStatus) {
				execSync(`touch ${SKIP_WASM_BUILD_FILE_PATH}`);
				console.log("Finished restoring WASM cache");
			} else {
				console.log("Failed restoring WASM cache");
			}
		} else {
			console.log("Submodule is updated");
		}
	} else {
		console.log("Submodule lock file is not found");
		await generateLockFile();
	}
};

export const onPostBuild = async ({ utils }) => {
	console.log("Started saving WASM cache");
	console.log(`Cache WASM Path: ${CACHE_WASM_PATH}`);
	const saveStatus = await utils.cache.save(
		[SUBMODULE_LOCK_PATH, CACHE_WASM_PATH],
		{
			digests: [SUBMODULE_LOCK_PATH],
		},
	);
	if (saveStatus) {
		console.log("Finished saving WASM cache");
	} else {
		console.log("Failed saving WASM cache");
	}
};

function resolve(path) {
	return fileURLToPath(new URL(path, import.meta.url));
}

async function generateLockFile() {
	execSync(
		`git ls-files -s biome | cut -d ' ' -f 2 > "${SUBMODULE_LOCK_PATH}"`,
	);
	return readFile(SUBMODULE_LOCK_PATH, { encoding: "utf8" });
}
