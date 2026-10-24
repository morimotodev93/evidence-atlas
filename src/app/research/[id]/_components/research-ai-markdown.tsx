import Markdown from "react-markdown";

// Model output is presentation only. Evidence links are resolved separately by
// parseSourceCitations and ResearchAiSupportingSources from stored Source data.
export function ResearchAiMarkdown({ children }: { children: string }) {
  return (
    <div className="min-w-0 space-y-3 text-sm leading-6 [overflow-wrap:anywhere] [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_h5]:text-sm [&_h6]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:max-w-full [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:whitespace-pre-wrap [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <Markdown
        skipHtml
        urlTransform={() => ""}
        components={{
          a: ({ children }) => <span>{children}</span>,
          img: () => null,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
