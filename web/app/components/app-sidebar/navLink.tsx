'use client'
import { useSelectedLayoutSegment } from 'next/navigation'
import classNames from 'classnames'
import Link from 'next/link'

export default function NavLink({
  name,
  href,
  iconMap,
}: {
  name: string
  href: string
  mode: string
  iconMap: { selected: any; normal: any }
}) {
  const segment = useSelectedLayoutSegment()
  const isActive = href.toLowerCase().split('/')?.pop() === segment?.toLowerCase()
  const NavIcon = iconMap.normal // isActive ? iconMap.selected : iconMap.normal
  const iconStyle = { padding: 6, background: 'white', boxShadow: isActive ? '0px 6px 15px rgba(90, 100, 120, 0.14)' : 'none', borderRadius: 4 }
  return (
    <Link
      key={name}
      href={href}
      className={classNames(
        // isActive ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-700',
        isActive ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700',
        'group flex items-center rounded-md px-2 py-2 text-sm font-normal',
      )}
      style={isActive
        ? {
          background: 'none',
          color: '#181A24',
        }
        : {
          color: '#181A24',
        }}
    >
      <span className='mr-2' style={iconStyle}>
        {NavIcon}
        {/* <NavIcon
          className={classNames(
            'h-4 w-4 flex-shrink-0',
            isActive ? 'text-primary-600' : 'text-gray-700',
          )}
          aria-hidden="true"
          style={{ color: "#181A24" }}
        /> */}
      </span>
      {name}
    </Link>
  )
}
