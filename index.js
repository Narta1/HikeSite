document.addEventListener("DOMContentLoaded", async () => {
    try {
      const response = await fetch("http://localhost:8080/me");
      if (!response.ok) return;
  
      const data = await response.json();
  
      const loginBtn = document.querySelector(".login-btn");
      loginBtn.textContent = data.username;
      loginBtn.onclick = null; 
      loginBtn.style.cursor = "default";
    } catch (error) {
      console.log("no user");
    }
  });
  
  async function loadTrails() {
    try {
      const sort = document.getElementById("sortFilter").value;
  
      let query = "/trails";
      const params = [];
      if (sort) params.push(`sort=${sort}`);
      if (params.length > 0) query += "?" + params.join("&");
  
      const res = await fetch(query);
      if (!res.ok) return;
  
      const trails = await res.json();
      const container = document.querySelector(".trail-grid");
      container.innerHTML = "";
  
      for (const trail of trails) {
        const card = document.createElement("div");
        card.className = "trail-card";
        card.innerHTML = `
          <img src="${trail.image}" alt="${trail.title}">
          <div class="trail-content">
            <h3>${trail.title} 
              <p><strong>Average Rating:</strong> ⭐ ${trail.avgRating}</p>
              <span class="badge ${trail.difficulty.toLowerCase()}">${trail.difficulty}</span>
              <p><strong>Distance:</strong> ${trail.distance} miles</p>
            </h3>
            <p class="location">${trail.location}</p>
            <p><strong>Start:</strong> ${trail.startingPoint}</p>
            <p>${trail.description}</p>
            <a href="trail.html?id=${trail.id}">View Details →</a>
          </div>
        `;
        container.appendChild(card);
      }
    } catch (err) {
      console.error("data cannot be taken:", err);
    }
  }
  
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const response = await fetch("/me");
      if (response.ok) {
        const data = await response.json();
        const loginBtn = document.querySelector(".login-btn");
        loginBtn.textContent = data.username;
        loginBtn.onclick = null;
        loginBtn.style.cursor = "default";
      }
    } catch (error) {
      console.log("no user");
    }
  
    await loadTrails();
  });
  
  