import {
  sectionRenderers,
  type SectionInstance,
} from "@/lib/registries/sectionTypes";

export interface DetailPanelSectionProps {
  sections: SectionInstance[];
}

export function DetailPanelSection({ sections }: DetailPanelSectionProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const Renderer = sectionRenderers[section.type];
        return (
          <Renderer
            key={`${section.type}-${section.title}`}
            title={section.title}
            data={section.data}
          />
        );
      })}
    </div>
  );
}
