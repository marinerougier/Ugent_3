# package import ----------------------------------------------------------
library(tidyverse)
library(jsonlite)
library(glue)
library(data.table)
library(magrittr)

# database import ---------------------------------------------------------
# Does not work with this ("permission denied")
 database <-
  fireData::download("https://marineexpe.firebaseio.com", "/") %>%
  write_rds(glue("backup/{as.integer(Sys.time())}.RData")) 


# vaast dataset -----------------------------------------------------------
dataset_vaast_trial <-
  database %>% 
  pluck("vaast_trial") %>% 
  map_dfr(~data_frame(epoch = .x$timestamp,
                      jspsych_id = .x$jspsych_id,
                      prolific_id = .x$prolific_id,
                      taskOrder = .x$taskOrder,
                      firstblockvaast = .x$experimental_condition,
                      temp_data = .x$vaast_trial_data)) %>% 
  mutate(timestamp = lubridate::as_datetime(epoch / 1000 ),
         temp_data = map(temp_data, ~ fromJSON(.x))) %>% 
  unnest()

# iat dataset -------------------------------------------------------------
dataset_iat_trial <-
  database %>% 
  pluck("iat_trial") %>% 
  map_dfr(~data_frame(epoch = .x$timestamp,
                      jspsych_id = .x$jspsych_id,
                      prolific_id = .x$prolific_id,
                      taskOrder = .x$taskOrder,
                      temp_data = .x$iat_trial_data,
                      iat_good_side = .x$iat_good_side,
                      iat_black_1_side = .x$iat_black_1_side)) %>% 
  mutate(timestamp = lubridate::as_datetime(epoch / 1000 ),
         temp_data = map(temp_data, ~ fromJSON(.x))) %>% 
  unnest()

# browser event dataset ---------------------------------------------------
dataset_browser_event <-
  database %>% 
  pluck("browser_event") %>% 
  map_dfr(~data_frame(epoch = .x$timestamp,
                      jspsych_id = .x$jspsych_id,
                      temp_data = .x$event_data,
                      completion = .x$completion),
          .id = "id") %>%
  group_by(jspsych_id) %>%
  arrange(desc(epoch)) %>% 
  filter(row_number() == 1) %>% 
  ungroup() %>% 
  mutate(timestamp = lubridate::as_datetime(epoch / 1000),
         temp_data = map(temp_data, ~ fromJSON(.x))) %>% 
  unnest()

# connections -------------------------------------------------------------

dataset_connection <-
  database %>% 
  pluck("VAAST_IAT") %>%
  map_dfr(~data_frame(data = list(pluck(.x))),
          .id = "jspsych_id")  %>% 
   unnest()   %>% 
   mutate(data = map(data, ~data_frame(epoch  = .x$timestamp,
                                      status = .x$status) %>% 
                      mutate(timestamp = lubridate::as_datetime(epoch / 1000))
                             )) %>% 
   unnest()

# export ------------------------------------------------------------------
#map2(list(dataset_browser_event,
#          dataset_iat_trial,
#          dataset_participant,
#          dataset_vaast_trial, 
#          dataset_connection),
#     list("dataset_browser_event",
#          "dataset_iat_trial",
#          "dataset_participant",
#          "dataset_vaast_trial", 
#          "dataset_connection"),
#     ~write_rds(.x, glue("data/{.y}.RData")))


save(dataset_vaast_trial, file = "data/data_VAAST.RData")
save(dataset_iat_trial, file = "data/data_IAT.RData")
save(dataset_browser_event, file = "data/data_browser.RData")
save(dataset_connection, file = "data/data_connection.RData")

