import detectProject from '../../project-detectors/index.mjs';

export default async function run(ctx) {
  const cfg = await detectProject(ctx.paths.project);
  await ctx.saveConfig(cfg);
  return {
    summary: `Detected ${cfg.frontend.framework}/${cfg.backend.framework} with ${cfg.routes.pages.length} pages and ${cfg.routes.endpoints.length} endpoints.`,
    configPath: ctx.paths.configPath,
    config: cfg,
  };
}
