const haProxyUrl = 'http://localhost:80';
const priceUpdateMap = new Map();
const holdingUpdateMap = new Map();
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("clientIdForm");
  if (form == null) {
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const clientId = document.getElementById("clientId").value;
    fetch('/portfolio.html', {
      method: 'POST',
      body: clientId
    })
    .then(response => {
      if(response.ok){
        return response.json()
      }else{
        throw new Error('Server response error: ' + response.statusText);
      }
    })
    .then(blotterUrl =>{
      window.location.href = `/portfolio.html?blotter=${blotterUrl}&clientId=${clientId}`;
    })
  });
});

//document.addEventListener("submit", )

// document.addEventListener("DOMContentLoaded", () => {
//   const clientId = new URLSearchParams(window.location.search).get("clientId");
//   console.log(`ClientId: ${clientId}`);
//   if (clientId != null) {
//     const table = document.getElementById("stock-data");
//     table.innerHTML = "";
//     connectToBlotter(clientId);
//   }
//});

function reconnectToBlotter(clientId){
  //Fetch new blotterUrl from HA Proxy
  fetch("/reconnect",{
    method: 'POST',
    body: clientId
  }).then(response => {
    if(response.ok){
      return response.json()
    }else{
      throw new Error('Server response error: ' + response.statusText);
    }
  })
  .then(blotterUrl =>{
    openBlotter(blotterUrl, clientId);
  })

}

//Retrieves blotter service node address and then opens blotter
// function connectToBlotter(clientId){
//   fetch(`http://localhost:8000/${clientId}`) // TODO - this will be a request to HA Proxy (!!)
//     .then(response => {
//       if (!response.ok) {
//         throw new Error(`HTTP error!\n${response.text}`);
//       }
//       return response.json();
//     })
//     .then(blotterUrl => {

//       openBlotter(blotterUrl, clientId);
//     })
//     .catch(error => {
//       console.error('Error:', error.message);
//     });
//}

function openBlotter(url, clientId) {
  const eventSource = new EventSource(`http://${url}/blotter/${clientId}`);
  eventSource.onmessage = (event) => {
    const row = JSON.parse(event.data);
    const prevPriceUpdate = priceUpdateMap.get(row.ticker);
    const prevHoldingUpdate = holdingUpdateMap.get(row.ticker);
    if(!prevPriceUpdate || prevPriceUpdate < row.priceLastUpdated || prevHoldingUpdate < row.holdingLastUpdated){
      updateStockTable(row);
      priceUpdateMap.set(row.ticker, row.priceLastUpdated);
      holdingUpdateMap.set(row.ticker, row.holdingLastUpdated);
    }
  };

  // Error handling for SSE connection
  eventSource.onerror = () => {
    console.error(`SSE connection to ${blotterUrl} closed for client ${clientId}. Attempting reconnect.`);
    eventSource.close();
    reconnectToBlotter(clientId);
  };
}

function updateStockTable(data) {
  const rowToUpdate = document.getElementById(data.ticker);
  if(parseInt(data.quantity) == 0){
    if(rowToUpdate){
      rowToUpdate.remove();
    }
    return;
  }
  if (rowToUpdate) {
    rowToUpdate.cells[1].textContent = data.quantity;
    rowToUpdate.cells[2].textContent = data.price;
    rowToUpdate.cells[3].textContent = data.market_value;
  } else {
    // If the row doesn't exist, create a new row
    const table = document.getElementById("stock-data");
    const newRow = document.createElement("tr");
    newRow.id = data.ticker;

    // Add cells for stock, quantity, price, and market value
    newRow.innerHTML = `<td>${data.ticker}</td><td>${data.quantity}</td><td>${data.price}</td><td>${data.market_value}</td>`;
    table.appendChild(newRow);
  }
}