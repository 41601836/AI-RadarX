// 统一错误边界组件
'use client';

import React, { ReactNode, Component, ErrorInfo } from 'react';
import { ErrorCode } from '../lib/api/common/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCode?: number;
  errorMessage?: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCode: undefined,
      errorMessage: undefined
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 检查是否为API错误（包含errorCode）
    const apiError = error as any;
    const errorCode = apiError.code || undefined;
    const errorMessage = error.message || '发生未知错误';

    return {
      hasError: true,
      error,
      errorCode,
      errorMessage
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 可以在此处记录错误日志
    console.error(`${this.props.moduleName || '模块'}发生错误:`, error, errorInfo);
  }

  handleRetry = () => {
    // 重置状态，重新渲染组件
    this.setState({
      hasError: false,
      error: null,
      errorCode: undefined,
      errorMessage: undefined
    });
  };

  render() {
    if (this.state.hasError) {
      const { errorCode, errorMessage, error } = this.state;
      const moduleName = this.props.moduleName || '该模块';

      // 根据错误类型显示不同的提示
      let errorTitle = '发生错误';
      let errorDetails = errorMessage;

      // 处理600xx业务错误
      if (errorCode && errorCode >= 60000 && errorCode < 70000) {
        errorTitle = '业务错误';
        errorDetails = `错误码: ${errorCode}\n${errorMessage}`;
      } 
      // 处理400xx客户端错误
      else if (errorCode && errorCode >= 400 && errorCode < 500) {
        errorTitle = '请求错误';
        errorDetails = `错误码: ${errorCode}\n${errorMessage}`;
      }
      // 处理500xx服务器错误
      else if (errorCode && errorCode >= 500 && errorCode < 600) {
        errorTitle = '服务器错误';
        errorDetails = `错误码: ${errorCode}\n${errorMessage}`;
      }

      return (
        <div className="error-boundary">
          <div className="error-card">
            <div className="error-header">
              <h3>{errorTitle}</h3>
            </div>
            <div className="error-content">
              <p>{moduleName}加载失败</p>
              <pre>{errorDetails}</pre>
              {error && (
                <div className="error-debug">
                  <small>{error.stack?.split('\n')[0]}</small>
                </div>
              )}
            </div>
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                重试
              </button>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              padding: 20px;
            }

            .error-card {
              background: #1e1e2e;
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              border: 1px solid #313244;
              max-width: 500px;
              width: 100%;
            }

            .error-header h3 {
              margin: 0;
              font-size: 18px;
              color: #f38ba8;
              margin-bottom: 16px;
            }

            .error-content {
              margin-bottom: 24px;
            }

            .error-content p {
              margin: 0 0 12px 0;
              color: #cdd6f4;
              font-size: 16px;
            }

            .error-content pre {
              background: #2a2a3a;
              padding: 12px;
              border-radius: 4px;
              margin: 0 0 12px 0;
              color: #94a3b8;
              font-size: 14px;
              white-space: pre-wrap;
              word-wrap: break-word;
            }

            .error-debug {
              background: #2a2a3a;
              padding: 8px;
              border-radius: 4px;
              color: #89dceb;
              font-size: 12px;
            }

            .error-actions {
              display: flex;
              justify-content: flex-end;
            }

            .retry-button {
              background: #89dceb;
              color: #1e1e2e;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .retry-button:hover {
              background: #b4f9f8;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}