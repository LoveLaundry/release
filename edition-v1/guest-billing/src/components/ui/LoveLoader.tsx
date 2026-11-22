const LoveLoader = () => {


    return (
        <div className="w-full z-100 min-h-screen flex justify-center items-center fixed bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] backdrop-blur-xl">
            <div className="absolute p-20 rounded-full border-t-8 border-t-[var(--accent)] animate-spin"></div>
            <img src="./icon.png" alt="Logo" className="w-20 h-20"/>
        </div>
    )
}

export default LoveLoader
