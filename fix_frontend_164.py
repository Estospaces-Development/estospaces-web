#!/usr/bin/env python3
"""Apply frontend fixes for open tickets."""

import re

BASE = r"C:\Users\jeevi\Estospaces\esto-app-projects\estospaces-web\src"

# Fix #164: Convert "See details" dropdown to modal dialog in FastTrackWorkspace
ftw = f"{BASE}\\components\\fast-track\\FastTrackWorkspace.tsx"
with open(ftw, encoding="utf-8") as f:
    code = f.read()

# Replace the dropdown <details> element with a button + modal portal
old = """                                {role === 'user' ? (
                                    <details
                                        open={userDetailsOpen}
                                        onToggle={(event) => setUserDetailsOpen(event.currentTarget.open)}
                                        className="group rounded-[28px] border border-gray-100 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                                            <span>See details</span>
                                            <span className="text-xs font-medium text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400">
                                                v
                                            </span>
                                        </summary>
                                        <div className="mt-4">
                                            <FastTrackUtilityDock
                                                role={role}
                                                density={workspacePreferences.secondaryDensity}
                                                modules={utilityModules}
                                                activeModule={activeUtilityModule}
                                                onActiveModuleChange={setActiveUtilityModule}
                                                renderModule={renderUtilityModule}
                                            />
                                        </div>
                                    </details>
                                ) : (
                                    <div className="min-w-0 max-w-full space-y-6">
                                        <FastTrackUtilityDock
                                            role={role}
                                            density={workspacePreferences.secondaryDensity}
                                            modules={utilityModules}
                                            activeModule={activeUtilityModule}
                                            onActiveModuleChange={setActiveUtilityModule}
                                            renderModule={renderUtilityModule}
                                        />
                                    </div>
                                )}"""

new = """                                {role === 'user' ? (
                                    <button
                                        type="button"
                                        onClick={() => setUserDetailsModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-[28px] border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:hover:border-gray-700"
                                    >
                                        <span>See details</span>
                                        <ExternalLink size={14} />
                                    </button>
                                ) : (
                                    <div className="min-w-0 max-w-full space-y-6">
                                        <FastTrackUtilityDock
                                            role={role}
                                            density={workspacePreferences.secondaryDensity}
                                            modules={utilityModules}
                                            activeModule={activeUtilityModule}
                                            onActiveModuleChange={setActiveUtilityModule}
                                            renderModule={renderUtilityModule}
                                        />
                                    </div>
                                )}
                                {userDetailsModalOpen ? renderFastTrackPortal(
                                    <div
                                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                                        onClick={() => setUserDetailsModalOpen(false)}
                                    >
                                        <div
                                            className="mx-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[28px] border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Case Details</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setUserDetailsModalOpen(false)}
                                                    className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    aria-label="Close details"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div className="mt-6">
                                                <FastTrackUtilityDock
                                                    role={role}
                                                    density={workspacePreferences.secondaryDensity}
                                                    modules={utilityModules}
                                                    activeModule={activeUtilityModule}
                                                    onActiveModuleChange={setActiveUtilityModule}
                                                    renderModule={renderUtilityModule}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : null}"""

if old in code:
    code = code.replace(old, new)
    with open(ftw, "w", encoding="utf-8") as f:
        f.write(code)
    print("#164 fixed: See details -> modal dialog")
else:
    print("WARNING: Could not find target text for #164")
