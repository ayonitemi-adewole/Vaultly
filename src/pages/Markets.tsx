import AppSidebar from '@/components/shared/app-sidebar';



const Markets = () => {
    return (
        <div className="min-h-screen bg-background transition-colors duration-300 dark:bg-slate-950">
            <AppSidebar />
            <main className="ml-64 p-8">
                <h1 className="text-5xl font-bold text-foreground dark:text-slate-100">Markets</h1>
                <p className="text-muted-foreground mt-4">Coming soon...</p>
            </main>
        </div>
    )
}

export default Markets