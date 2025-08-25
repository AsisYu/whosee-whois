'use client';

import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { BlogPost } from '@/types';

interface BlogPostContentProps {
  post?: BlogPost;
  locale?: string;
  content?: string;
}

export function BlogPostContent({ post, locale, content }: BlogPostContentProps) {
  // 如果直接传递了 content，使用它；否则使用 post.content
  const markdownContent = content || post?.content || '';
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none mb-12">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        children={markdownContent}
        components={{
          // 自定义图片组件，支持 Next.js Image 优化
          img: ({ node, ...props }) => {
            const { src, alt, title } = props;
            
            if (!src) return null;
            
            // 确保 src 是字符串类型
            const srcString = typeof src === 'string' ? src : '';
            if (!srcString) return null;
            
            // 获取 Strapi 基础 URL
            const strapiBaseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
            
            // 检查是否是 Strapi 图片
            const isLocalStrapiImage = srcString.startsWith(`${strapiBaseUrl}/uploads/`);
            const isStrapiImage = srcString.includes('/uploads/');
            
            // 如果是 Strapi 图片，使用 Next.js Image 组件
            if (isLocalStrapiImage || isStrapiImage) {
              // 确保使用完整的 URL
              const imageUrl = isLocalStrapiImage 
                ? srcString 
                : srcString.startsWith('http') 
                  ? srcString 
                  : `${strapiBaseUrl}${srcString}`;
              
              return (
                <Image
                  src={imageUrl}
                  alt={alt || ''}
                  title={title}
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg my-8 w-full h-auto"
                />
              );
            }
            
            // 对于其他图片，使用标准 img 标签
            return (
              <img
                src={srcString}
                alt={alt || ''}
                title={title}
                className="rounded-lg shadow-lg w-full h-auto my-8"
              />
            );
          },
          
          // 自定义代码块组件，支持语法高亮
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow as any}
                language={match[1]}
                PreTag="div"
                className="rounded-lg"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          
          // 自定义链接组件
          a: ({ node, ...props }) => {
            const { href, children } = props;
            
            // 外部链接在新窗口打开
            if (href && href.startsWith('http')) {
              return (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  {children}
                </a>
              );
            }
            
            return (
              <a {...props} className="text-primary hover:text-primary/80 underline">
                {children}
              </a>
            );
          },
          
          // 自定义表格组件
          table: ({ node, ...props }) => (
            <table className="min-w-full border-collapse border border-border my-6" {...props} />
          ),
          
          th: ({ node, ...props }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold" {...props} />
          ),
          
          td: ({ node, ...props }) => (
            <td className="border border-border px-4 py-2" {...props} />
          ),
          
          // 自定义引用块组件
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground" {...props} />
          ),
          
          // 自定义标题组件，添加锚点
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 scroll-mt-20" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3 scroll-mt-20" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mt-5 mb-2 scroll-mt-20" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-bold mt-4 mb-2 scroll-mt-20" {...props} />
          ),
          h5: ({ node, ...props }) => (
            <h5 className="text-base font-bold mt-3 mb-2 scroll-mt-20" {...props} />
          ),
          h6: ({ node, ...props }) => (
            <h6 className="text-sm font-bold mt-2 mb-1 scroll-mt-20" {...props} />
          ),
        }}
      />
    </div>
  );
}