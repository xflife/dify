import type { FC, MouseEventHandler } from 'react'
import React from 'react'
import Spinner from '../spinner'

export type IButtonProps = {
  type?: 'primary' | 'warning' | 'nohover' | string
  className?: string
  disabled?: boolean
  loading?: boolean
  tabIndex?: number
  children: React.ReactNode
  onClick?: MouseEventHandler<HTMLDivElement>
}

const Button: FC<IButtonProps> = ({
  type,
  disabled,
  children,
  className,
  onClick,
  loading = false,
  tabIndex,
}) => {
  let style = 'cursor-pointer'
  switch (type) {
    case 'primary':
      style = (disabled || loading) ? 'bg-[#181A24] cursor-not-allowed text-white' : 'bg-[#181A24]  hover:bg-[#181A24]/75 hover:shadow-md cursor-pointer text-white hover:shadow-sm'
      break
    case 'warning':
      style = (disabled || loading) ? 'bg-red-600/75 cursor-not-allowed text-white' : 'bg-red-600 hover:bg-red-600/75 hover:shadow-md cursor-pointer text-white hover:shadow-sm'
      break
    case 'nohover':
      style = 'border-solid border border-gray-200 cursor-pointer text-gray-500'
      break
    default:
      style = disabled ? 'border-solid border border-[#F1F3F9] bg-gray-200 cursor-not-allowed text-gray-800' : 'border-solid border border-[#F1F3F9] cursor-pointer text-gray-500 hover:bg-white hover:shadow-sm hover:border-gray-300'
      break
  }

  return (
    <div
      className={`inline-flex justify-center items-center content-center h-10 leading-6 rounded-3xl px-4 py-2 text-base ${style} ${className && className}`}
      tabIndex={tabIndex}
      onClick={disabled ? undefined : onClick}
    >
      {children}
      {/* Spinner is hidden when loading is false */}
      <Spinner loading={loading} className='!text-white !h-3 !w-3 !border-2 !ml-1' />
    </div>
  )
}

export default React.memo(Button)
