import { Fragment } from "react";
import type { Channel } from "@/lib/api-types";

/** Converte o *negrito* do WhatsApp em <b>, linha a linha. */
function WhatsappText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i, all) => (
        <Fragment key={i}>
          {line.split(/(\*[^*\n]+\*)/g).map((part, j) =>
            /^\*[^*]+\*$/.test(part) ? (
              <b key={j} className="font-bold">
                {part.slice(1, -1)}
              </b>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
          {i < all.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

/** O texto exato que saiu (ou vai sair): balão de WhatsApp ou e-mail com assunto. */
export function MessagePreview({ channel, subject, body, to }: { channel: Channel; subject: string | null; body: string; to?: string }) {
  if (channel === "email") {
    return (
      <div className="rounded-inner bg-chat p-3">
        <div className="rounded-[14px] bg-white px-4 py-[14px] text-[13px] leading-[20px]">
          {to && (
            <p className="text-ink-2">
              Para: <span className="text-ink">{to}</span>
            </p>
          )}
          <p className="mt-[2px] font-semibold">{subject ?? "(sem assunto)"}</p>
          <div className="my-3 h-px bg-line" />
          <p className="whitespace-pre-wrap">{body}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-inner bg-chat p-3">
      <p className="max-w-[92%] rounded-[6px_18px_18px_18px] bg-white px-[14px] py-3 text-[13px] leading-[20px] break-words">
        <WhatsappText text={body} />
      </p>
    </div>
  );
}
