document.addEventListener("DOMContentLoaded", () => {
    const menu = document.getElementById("settings-menu") as HTMLElement
    const settingsButton = document.getElementById("settings-button") as HTMLButtonElement
    const radioButtons = document.querySelectorAll<HTMLInputElement>('input[type="radio"]')

    // Load saved selections from localStorage
    const savedSelections = JSON.parse(localStorage.getItem("settingsMenu") || "{}") as Record<string, string>

    // Initialize settings and event listeners
    const initializeSettings = () => {
        radioButtons.forEach((radio) => {
            if (savedSelections[radio.name] === radio.value) {
                radio.checked = true
            }

            radio.addEventListener("change", () => {
                saveSelections()
                applySettings()
            })
        })

        // Apply settings when navigation occurs
        document.addEventListener("nav", applySettings)
    }

    // Toggle menu visibility with accessibility support
    const toggleMenu = (show: boolean) => {
        menu.setAttribute("aria-hidden", String(!show))
        settingsButton.setAttribute("aria-expanded", String(show))
        menu.style.display = show ? "block" : "none"
    }

    // Handle menu button click
    settingsButton?.addEventListener("click", (e) => {
        e.stopPropagation()
        const isVisible = menu.style.display === "block"
        toggleMenu(!isVisible)
    })

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target as Node) && e.target !== settingsButton) {
            toggleMenu(false)
        }
    })

    // Close menu on Escape key press
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            toggleMenu(false)
        }
    })

    // Save selected radio buttons to localStorage
    const saveSelections = () => {
        const selectedRadios: Record<string, string> = {}

        radioButtons.forEach((radio) => {
            if (radio.checked) {
                selectedRadios[radio.name] = radio.value
            }
        })

        localStorage.setItem("settingsMenu", JSON.stringify(selectedRadios))
    }

    // Apply saved settings to the page
    const applySettings = () => {
        const savedSelections = JSON.parse(localStorage.getItem("settingsMenu") || "{}") as Record<string, string>

        const selectedFont = savedSelections["radioFont"]
        const selectedFontSize = savedSelections["radioFontSize"]
        const selectedWidth = savedSelections["radioWidth"]

        const pageElement = document.querySelector(".page") as HTMLElement

        if (pageElement) {
            if (selectedFont) {
                pageElement.style.setProperty("font-family", `"${selectedFont}", sans-serif`, "important")
            }
            if (selectedFontSize) {
                pageElement.style.setProperty("font-size", selectedFontSize, "important")
            }
            if (selectedWidth) {
                pageElement.style.setProperty("max-width", `${selectedWidth}%`, "important")
            }
        }
    }

    // Initialize the settings and apply them on page load
    initializeSettings()
    applySettings()
})