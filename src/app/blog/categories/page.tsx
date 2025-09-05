import { redirect } from 'next/navigation';

export default function CategoriesRedirect() {
  // 重定向到默认语言（中文）的分类页面
  redirect('/zh/blog/categories');
}