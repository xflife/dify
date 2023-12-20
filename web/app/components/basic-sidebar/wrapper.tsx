'use client'
// import classNames from 'classnames'
// import { usePathname } from 'next/navigation'
import BasicSideBar from './index'
// import s from './index.module.css'

type HeaderWrapperProps = {
  children: React.ReactNode
}

const HeaderWrapper = ({
  children,
}: HeaderWrapperProps) => {
  // const pathname = usePathname()
  // const isBordered = ['/apps', '/datasets'].includes(pathname)

  return (
    <div className='flex w-full h-full'>
      <div className='w-[110px]'>
        <BasicSideBar title={''} desc={''} navigation={[]} layout={''} />
      </div>
      <div className='' style={{ width: 'calc(100vw - 110px)' }}>
        {children}
      </div>
    </div>
  )
}
export default HeaderWrapper
