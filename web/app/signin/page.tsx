import React from 'react'
import cn from 'classnames'
import Forms from './forms'
import Header from './_header'
import style from './page.module.css'

const SignIn = () => {
  return (
    <>
      <div className={cn(
        style.background,
        'flex w-full min-h-screen',
        'sm:p-10 lg:p-20',
        'gap-x-25',
        'justify-center lg:justify-center',
      )}>
        <div className={
          cn(
            'flex w-5/6 flex-col bg-white shadow rounded-2xl shrink-0',
            'space-between',
          )
        }>
          <Header />
          <Forms />
          <div className='flex justify-between px-8 py-6 text-sm font-normal text-gray-500'>
            <div>V1.1.0</div>
            <div>© {new Date().getFullYear()} LangGenius, Inc. All rights reserved.</div>
          </div>
        </div>

      </div>

    </>
  )
}

export default SignIn
