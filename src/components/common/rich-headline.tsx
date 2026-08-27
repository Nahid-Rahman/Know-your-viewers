import { Fragment } from "react";

/** Renders editable headline copy: "\n" breaks lines, **text** gets the gradient highlight. */
export function RichHeadline({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <span key={j} className="text-gradient-primary">
                {part.slice(2, -2)}
              </span>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}
