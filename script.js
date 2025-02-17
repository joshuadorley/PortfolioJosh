document.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    const formData = new FormData(this);

    try {
        const response = await fetch("https://portfoliojosh.onrender.com/contact", { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(jsonData),  // ❌ ERROR: jsonData is not defined
        });

        if (response.ok) {
            alert("Message sent successfully!");
            this.reset();
        } else {
            alert("Failed to send message. Please try again.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Please try again.");
    }
});
