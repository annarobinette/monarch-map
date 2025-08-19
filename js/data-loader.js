// js/data-loader.js - Final Version

async function loadAndProcessData() {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby3l5meHbJCcIdiNDkA21IK8t9nZQSCIEM6vuGzc2VLfsYz1sVXhXZOdUg-CkDMAV4zlQ/exec'; 

    try {
        const response = await fetch(WEB_APP_URL);
        if (!response.ok) throw new Error(`Network response was not ok`);
        
        const rawData = await response.json();

        if (!rawData.houseData || !rawData.people || !rawData.monarchs) {
            throw new Error("Essential data (houses, people, or monarchs) is missing from the API response.");
        }

        const houseColors = {};
        rawData.houseData.forEach(house => {
            if (house.house && house.colour) {
                houseColors[house.house] = house.colour;
            }
        });
        houseColors['Default'] = '#777777';

        console.log("Live data from Apps Script loaded successfully!");
        
        // Return all the cleaned data lists directly
        return { 
            people: rawData.people || [],
            monarchs: rawData.monarchs || [],
            locations: rawData.locations || [],
            burials: rawData.burials || [],
            relationships: rawData.relationships || [],
            parentage: rawData.parentage || [],
            collections: rawData.collections || [],
            collectionContents: rawData.collectionContents || [],
            challenges: rawData.challenges || [],
            houseColors: houseColors 
        };

    } catch (error) {
        console.error("Failed to load or process live data from Google Apps Script:", error);
        alert("Failed to load data. Please check the developer console for details.");
        return null; 
    }
}
