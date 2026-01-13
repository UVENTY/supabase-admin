import fieldHref from "./field";
import "./styles.css";

export default function StadiumScheme({ value = {} }) {
  if (!value) return null;

  const { viewBox, field = {}, sections = {}, text = [] } = value;

  const stylesheet = `
  .stadium-svg {
    ${Object.keys(sections)
      .map(
        (section) => `
            [data-section="${section}"]>path { fill: ${sections[section].fill[0]} }
            [data-section="${section}"]:hover>path { fill: ${sections[section].fill[1]} !important }
          `
      )
      .join("")}
  }`;

  return (
    <>
      <style>{stylesheet}</style>
      <svg viewBox={viewBox} className="stadium-svg">
        {!!field.width && !!field.height && (
          <image
            href={fieldHref}
            width={field.width}
            height={field.height}
            transform={`translate(${field.translate})`}
          />
        )}
        {Object.keys(sections).map((section) => {
          const blocks = sections[section].blocks;
          const fill = sections[section].fill;
          return (
            <g key={section} data-section={section}>
              {Object.keys(blocks).map((block) => {
                const rest = {
                  style: {
                    fill: fill[2],
                  },
                  className: "block-tickets",
                };
                const d = Array.isArray(blocks[block].d)
                  ? blocks[block].d.join(" ")
                  : blocks[block].d;
                return <path key={block} data-block={block} d={d} {...rest} />;
              })}
            </g>
          );
        })}
        {text.map((item, i) => {
          let transform;
          if (item.transform) {
            transform =
              item.transform.indexOf("matrix") === 0
                ? item.transform
                : `translate(${item.transform})`;
          }
          return (
            <text
              key={`${item.text}-${i}`}
              fontSize={item.fontSize || 12}
              transform={transform}
              pointerEvents="none"
            >
              {item.text}
            </text>
          );
        })}
      </svg>
    </>
  );
}
