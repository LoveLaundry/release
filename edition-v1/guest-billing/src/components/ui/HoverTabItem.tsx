const HoverTabItem=({tab}:{tab: string | null})=>{
    return(
        <div className="absolute select-none active:bg-[var(--brand-soft)] w-full flex items-center justify-center text-[var(--text-primary)] h-full backdrop-blur-lg bg-[var(--surface)] animate-slideIn">
            {tab}
        </div>
    )
}

export default HoverTabItem
