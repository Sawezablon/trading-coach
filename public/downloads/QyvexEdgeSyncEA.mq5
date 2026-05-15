//+------------------------------------------------------------------+
//| Qyvex Edge Sync EA                                               |
//| Read-only MetaTrader 5 sync bridge for Qyvex Edge.               |
//| This EA does not place, modify, or close trades.                  |
//+------------------------------------------------------------------+
#property strict
#property version   "1.03"
#property description "Read-only Qyvex Edge trade sync EA."

input string QyvexApiKey = "";
input string SyncUrl = "https://sync.qyvexedge.com/api/mt5/sync";
input int SyncIntervalMinutes = 5;
input int InitialHistoryLookbackDays = 365;
input int SyncOverlapMinutes = 10;

datetime g_lastSyncTime = 0;
string g_lastStatus = "Waiting for first sync";
int g_lastTradesSent = 0;
bool g_resyncRequested = false;
int g_resyncLookbackDays = 0;
string g_resyncRequestId = "";

string StateKeyPrefix()
{
   return "QyvexEdge_" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + "_";
}

string FirstSyncKey()
{
   return StateKeyPrefix() + "FirstSyncDone";
}

string LastSuccessfulSyncKey()
{
   return StateKeyPrefix() + "LastSuccessfulSync";
}

bool FirstSyncDone()
{
   return GlobalVariableCheck(FirstSyncKey()) && GlobalVariableGet(FirstSyncKey()) > 0;
}

datetime LastSuccessfulSync()
{
   if(!GlobalVariableCheck(LastSuccessfulSyncKey()))
      return 0;

   return (datetime)GlobalVariableGet(LastSuccessfulSyncKey());
}

void MarkSyncSuccess(datetime syncTime)
{
   GlobalVariableSet(FirstSyncKey(), 1);
   GlobalVariableSet(LastSuccessfulSyncKey(), (double)syncTime);
}

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   StringReplace(value, "\t", "\\t");
   return value;
}

string JsonString(string value)
{
   return "\"" + JsonEscape(value) + "\"";
}

string JsonNumber(double value)
{
   return DoubleToString(value, 8);
}

string JsonTime(datetime value)
{
   if(value <= 0)
      return "\"\"";

   return JsonString(TimeToString(value, TIME_DATE | TIME_SECONDS));
}

string UrlEncode(string value)
{
   string encoded = "";

   for(int index = 0; index < StringLen(value); index++)
   {
      ushort character = StringGetCharacter(value, index);

      if((character >= 'A' && character <= 'Z') ||
         (character >= 'a' && character <= 'z') ||
         (character >= '0' && character <= '9') ||
         character == '-' || character == '_' || character == '.' || character == '~')
      {
         encoded += ShortToString(character);
      }
      else
      {
         encoded += "%" + StringFormat("%02X", character);
      }
   }

   return encoded;
}

string BaseUrl()
{
   int marker = StringFind(SyncUrl, "/api/mt5/sync");

   if(marker > 0)
      return StringSubstr(SyncUrl, 0, marker);

   return SyncUrl;
}

string ExtractJsonString(string json, string key)
{
   string marker = "\"" + key + "\":\"";
   int start = StringFind(json, marker);

   if(start < 0)
      return "";

   start += StringLen(marker);
   int end = StringFind(json, "\"", start);

   if(end < 0)
      return "";

   return StringSubstr(json, start, end - start);
}

int ExtractJsonInt(string json, string key, int fallback)
{
   string marker = "\"" + key + "\":";
   int start = StringFind(json, marker);

   if(start < 0)
      return fallback;

   start += StringLen(marker);
   string number = "";

   for(int index = start; index < StringLen(json); index++)
   {
      ushort character = StringGetCharacter(json, index);

      if(character < '0' || character > '9')
         break;

      number += ShortToString(character);
   }

   if(number == "")
      return fallback;

   return (int)StringToInteger(number);
}

bool JsonHasKey(string json, string key)
{
   return StringFind(json, "\"" + key + "\":") >= 0;
}

string CompactResponse(string response)
{
   string compact = response;
   StringReplace(compact, "\r", " ");
   StringReplace(compact, "\n", " ");

   if(StringLen(compact) > 120)
      return StringSubstr(compact, 0, 120) + "...";

   return compact;
}

string DirectionFromDealType(long dealType)
{
   if(dealType == DEAL_TYPE_BUY)
      return "buy";

   if(dealType == DEAL_TYPE_SELL)
      return "sell";

   return "";
}

string DirectionFromPositionType(long positionType)
{
   if(positionType == POSITION_TYPE_BUY)
      return "buy";

   if(positionType == POSITION_TYPE_SELL)
      return "sell";

   return "";
}

bool IsClosingEntry(long entryType)
{
   return entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_INOUT || entryType == DEAL_ENTRY_OUT_BY;
}

string BuildTradeJson(
   string ticket,
   string symbol,
   string direction,
   double lotSize,
   double entryPrice,
   double stopLoss,
   double takeProfit,
   datetime openTime,
   datetime closeTime,
   double closePrice,
   double profit,
   double commission,
   double swap,
   string status
)
{
   string json = "{";
   json += "\"ticket\":" + JsonString(ticket) + ",";
   json += "\"symbol\":" + JsonString(symbol) + ",";
   json += "\"direction\":" + JsonString(direction) + ",";
   json += "\"lotSize\":" + JsonNumber(lotSize) + ",";
   json += "\"entryPrice\":" + JsonNumber(entryPrice) + ",";
   json += "\"stopLoss\":" + JsonNumber(stopLoss) + ",";
   json += "\"takeProfit\":" + JsonNumber(takeProfit) + ",";
   json += "\"openTime\":" + JsonTime(openTime) + ",";
   json += "\"closeTime\":" + JsonTime(closeTime) + ",";
   json += "\"closePrice\":" + JsonNumber(closePrice) + ",";
   json += "\"profit\":" + JsonNumber(profit) + ",";
   json += "\"commission\":" + JsonNumber(commission) + ",";
   json += "\"swap\":" + JsonNumber(swap) + ",";
   json += "\"status\":" + JsonString(status);
   json += "}";
   return json;
}

void AppendJsonItem(string &items, int &count, string item)
{
   if(count > 0)
      items += ",";

   items += item;
   count++;
}

int CollectOpenPositions(string &items)
{
   int count = 0;
   int total = PositionsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong ticket = PositionGetTicket(index);

      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      long positionType = PositionGetInteger(POSITION_TYPE);
      string direction = DirectionFromPositionType(positionType);

      if(direction == "")
         continue;

      string tradeJson = BuildTradeJson(
         IntegerToString((long)ticket),
         PositionGetString(POSITION_SYMBOL),
         direction,
         PositionGetDouble(POSITION_VOLUME),
         PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_SL),
         PositionGetDouble(POSITION_TP),
         (datetime)PositionGetInteger(POSITION_TIME),
         0,
         0.0,
         PositionGetDouble(POSITION_PROFIT),
         0.0,
         PositionGetDouble(POSITION_SWAP),
         "open"
      );

      AppendJsonItem(items, count, tradeJson);
   }

   return count;
}

bool FindEntryDeal(ulong positionId, datetime &openTime, double &entryPrice, string &direction, double &lotSize)
{
   bool found = false;
   int total = HistoryDealsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong dealTicket = HistoryDealGetTicket(index);

      if(dealTicket == 0)
         continue;

      ulong dealPositionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

      if(dealPositionId != positionId)
         continue;

      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(entryType != DEAL_ENTRY_IN && entryType != DEAL_ENTRY_INOUT)
         continue;

      string entryDirection = DirectionFromDealType(HistoryDealGetInteger(dealTicket, DEAL_TYPE));

      if(entryDirection == "")
         continue;

      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      if(!found || dealTime < openTime)
      {
         found = true;
         openTime = dealTime;
         entryPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
         direction = entryDirection;
         lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      }
   }

   return found;
}

datetime ClosedHistoryFrom()
{
   datetime now = TimeCurrent();
   datetime lastSuccessfulSync = LastSuccessfulSync();

   if(g_resyncRequested)
      return now - (MathMax(1, g_resyncLookbackDays) * 24 * 60 * 60);

   if(!FirstSyncDone() || lastSuccessfulSync <= 0)
      return now - (MathMax(1, InitialHistoryLookbackDays) * 24 * 60 * 60);

   return lastSuccessfulSync - (MathMax(0, SyncOverlapMinutes) * 60);
}

int CollectClosedDeals(string &items)
{
   int count = 0;
   datetime now = TimeCurrent();
   datetime historyFrom = ClosedHistoryFrom();

   if(!HistorySelect(historyFrom, now))
      return 0;

   int total = HistoryDealsTotal();

   for(int index = 0; index < total; index++)
   {
      ulong dealTicket = HistoryDealGetTicket(index);

      if(dealTicket == 0)
         continue;

      long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

      if(!IsClosingEntry(dealEntry))
         continue;

      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);

      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      datetime openTime = 0;
      double entryPrice = 0.0;
      string direction = "";
      double lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);

      if(!FindEntryDeal(positionId, openTime, entryPrice, direction, lotSize))
      {
         direction = dealType == DEAL_TYPE_SELL ? "buy" : "sell";
         openTime = closeTime;
      }

      string tradeJson = BuildTradeJson(
         IntegerToString((long)positionId),
         HistoryDealGetString(dealTicket, DEAL_SYMBOL),
         direction,
         lotSize,
         entryPrice,
         0.0,
         0.0,
         openTime,
         closeTime,
         HistoryDealGetDouble(dealTicket, DEAL_PRICE),
         HistoryDealGetDouble(dealTicket, DEAL_PROFIT),
         HistoryDealGetDouble(dealTicket, DEAL_COMMISSION),
         HistoryDealGetDouble(dealTicket, DEAL_SWAP),
         "closed"
      );

      AppendJsonItem(items, count, tradeJson);
   }

   return count;
}

string BuildSyncPayload(string tradesJson)
{
   string payload = "{";
   payload += "\"apiKey\":" + JsonString(QyvexApiKey) + ",";
   payload += "\"accountNumber\":" + JsonString(IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN))) + ",";
   payload += "\"broker\":" + JsonString(AccountInfoString(ACCOUNT_SERVER)) + ",";
   if(g_resyncRequested && g_resyncRequestId != "")
      payload += "\"syncRequestId\":" + JsonString(g_resyncRequestId) + ",";
   payload += "\"trades\":[" + tradesJson + "]";
   payload += "}";
   return payload;
}

bool ExtractNextJsonObject(string source, int &cursor, string &item)
{
   int depth = 0;
   int start = -1;
   int length = StringLen(source);

   for(int index = cursor; index < length; index++)
   {
      ushort character = StringGetCharacter(source, index);

      if(character == '{')
      {
         if(depth == 0)
            start = index;

         depth++;
      }
      else if(character == '}')
      {
         depth--;

         if(depth == 0 && start >= 0)
         {
            item = StringSubstr(source, start, index - start + 1);
            cursor = index + 1;

            while(cursor < length && StringGetCharacter(source, cursor) == ',')
               cursor++;

            return true;
         }
      }
   }

   return false;
}

void UpdateChartStatus()
{
   string lastSync = g_lastSyncTime > 0 ? TimeToString(g_lastSyncTime, TIME_DATE | TIME_SECONDS) : "Never";

   Comment(
      "Qyvex Edge Sync EA\n",
      "Read-only mode: enabled\n",
      "Last sync: ", lastSync, "\n",
      "Status: ", g_lastStatus, "\n",
      "Trades sent: ", IntegerToString(g_lastTradesSent), "\n",
      "First history sync: ", FirstSyncDone() ? "done" : "pending", "\n",
      "Manual resync: ", g_resyncRequested ? "pending" : "none", "\n",
      "Sync URL: ", SyncUrl
   );
}

void CheckResyncRequest()
{
   g_resyncRequested = false;
   g_resyncLookbackDays = 0;
   g_resyncRequestId = "";

   if(QyvexApiKey == "" || SyncUrl == "")
      return;

   string requestUrl = BaseUrl() + "/api/mt5/sync-request?apiKey=" + UrlEncode(QyvexApiKey) +
      "&accountNumber=" + UrlEncode(IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)));
   char postData[];
   char result[];
   string resultHeaders = "";
   string headers = "";

   ResetLastError();
   int statusCode = WebRequest("GET", requestUrl, headers, 10000, postData, result, resultHeaders);
   string response = CharArrayToString(result, 0, -1, CP_UTF8);

   if(statusCode == -1)
      return;

   if(statusCode < 200 || statusCode >= 300)
      return;

   if(StringFind(response, "\"resyncRequired\":true") < 0)
      return;

   g_resyncRequested = true;
   g_resyncRequestId = ExtractJsonString(response, "requestId");
   g_resyncLookbackDays = ExtractJsonInt(response, "lookbackDays", InitialHistoryLookbackDays);
}

bool SendPayload(string payload, int tradesSent)
{
   char postData[];
   char result[];
   string resultHeaders = "";
   string headers = "Content-Type: application/json\r\n";

   StringToCharArray(payload, postData, 0, StringLen(payload), CP_UTF8);
   ResetLastError();

   int statusCode = WebRequest("POST", SyncUrl, headers, 15000, postData, result, resultHeaders);
   string response = CharArrayToString(result, 0, -1, CP_UTF8);

   if(statusCode == -1)
   {
      int errorCode = GetLastError();
      g_lastStatus = "Failed. WebRequest error " + IntegerToString(errorCode);
      g_lastTradesSent = tradesSent;
      return false;
   }

   if(statusCode < 200 || statusCode >= 300)
   {
      g_lastStatus = "Failed. HTTP " + IntegerToString(statusCode) + " " + response;
      g_lastTradesSent = tradesSent;
      return false;
   }

   if(JsonHasKey(response, "error"))
   {
      string serverError = ExtractJsonString(response, "error");
      g_lastStatus = "Failed. Server: " + (serverError == "" ? CompactResponse(response) : serverError);
      g_lastTradesSent = tradesSent;
      return false;
   }

   int created = ExtractJsonInt(response, "created", 0);
   int updated = ExtractJsonInt(response, "updated", 0);
   int skipped = ExtractJsonInt(response, "skipped", 0);
   int received = ExtractJsonInt(response, "received", -1);
   int saved = created + updated;

   if(tradesSent > 0 && saved <= 0)
   {
      g_lastStatus = "Failed. Server saved 0/" + IntegerToString(tradesSent) +
         " trades. Received: " + IntegerToString(received) +
         ", skipped: " + IntegerToString(skipped);
      g_lastTradesSent = tradesSent;
      return false;
   }

   g_lastSyncTime = TimeCurrent();
   if(tradesSent > 0)
      g_lastStatus = "Success. Created " + IntegerToString(created) +
         ", updated " + IntegerToString(updated) +
         ", skipped " + IntegerToString(skipped);
   else
      g_lastStatus = "Success. No trades to send";
   g_lastTradesSent = tradesSent;
   MarkSyncSuccess(g_lastSyncTime);
   return true;
}

bool SendTradeItems(string tradesJson, int tradesSent)
{
   if(tradesSent <= 1)
      return SendPayload(BuildSyncPayload(tradesJson), tradesSent);

   int cursor = 0;
   int sent = 0;
   string item = "";

   while(ExtractNextJsonObject(tradesJson, cursor, item))
   {
      sent++;

      if(!SendPayload(BuildSyncPayload(item), 1))
      {
         g_lastStatus = "Failed on trade " + IntegerToString(sent) + "/" + IntegerToString(tradesSent) +
            ". " + g_lastStatus;
         g_lastTradesSent = sent;
         return false;
      }
   }

   if(sent != tradesSent)
   {
      g_lastStatus = "Failed. Prepared " + IntegerToString(tradesSent) +
         " trades, parsed " + IntegerToString(sent) + " payload items.";
      g_lastTradesSent = sent;
      return false;
   }

   g_lastSyncTime = TimeCurrent();
   g_lastStatus = "Success. Sent " + IntegerToString(sent) + " trade payloads.";
   g_lastTradesSent = sent;
   MarkSyncSuccess(g_lastSyncTime);
   return true;
}

void SyncNow()
{
   if(QyvexApiKey == "" || SyncUrl == "")
   {
      g_lastStatus = "Missing API key or Sync URL";
      g_lastTradesSent = 0;
      UpdateChartStatus();
      return;
   }

   string tradesJson = "";
   int tradesSent = 0;

   CheckResyncRequest();
   tradesSent += CollectOpenPositions(tradesJson);
   tradesSent += CollectClosedDeals(tradesJson);

   SendTradeItems(tradesJson, tradesSent);

   UpdateChartStatus();
}

int OnInit()
{
   int intervalSeconds = MathMax(1, SyncIntervalMinutes) * 60;

   EventSetTimer(intervalSeconds);
   g_lastStatus = "Initialized";
   UpdateChartStatus();
   SyncNow();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   SyncNow();
}
