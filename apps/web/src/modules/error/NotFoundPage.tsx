import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 text-center">
        {/* 错误图标 */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <AlertCircle className="w-32 h-32 text-red-500" />
            <div className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">4</span>
            </div>
            <div className="absolute -bottom-2 -left-2 bg-red-100 dark:bg-red-900 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">4</span>
            </div>
          </div>
        </div>

        {/* 错误信息 */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          页面未找到
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          抱歉，您访问的页面不存在或已被移除。
          <br />
          请检查 URL 是否正确，或从首页重新导航。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回上一页
          </button>
        </div>

        {/* 帮助信息 */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            如果您认为这是一个错误，请联系管理员
          </p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            错误代码：404_NOT_FOUND
          </p>
        </div>
      </div>
    </div>
  );
}
