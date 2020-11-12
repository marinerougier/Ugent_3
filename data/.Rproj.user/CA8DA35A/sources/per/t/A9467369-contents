# packages ----------------------------------------------------------------
library(tidyverse)

# building tidy dataset ---------------------------------------------------

# meta infos
browser_event <- 
  read_rds("data/dataset_browser_event.RData") %>% 
  add_count(jspsych_id) %>% 
  select(jspsych_id, 
         n,
         timestamp,
         temp_data) %>% 
  nest(timestamp, temp_data,
       .key = "event_log") %>% 
  rename(event = n)

connections <-
  read_rds("data/dataset_connection.RData") %>% 
  add_count(jspsych_id) %>% 
  select(jspsych_id, 
         n,
         timestamp,
         status) %>% 
  nest(timestamp, status,
       .key = "connection_log") %>% 
  rename(connection = n)

# vaast
vaast <-
  read_rds("data/dataset_vaast_trial.RData") %>% 
  select(-epoch) %>% 
  add_count(jspsych_id) %>%
  mutate(n = n / 3) %>% 
  group_by(jspsych_id, n) %>% 
  nest() %>% 
  rename(vaast_trial = n,
         vaast_data = data)

# iat 
iat <-
  read_rds("data/dataset_iat_trial.RData") %>% 
  select(-epoch) %>% 
  add_count(jspsych_id) %>% 
  group_by(jspsych_id, n) %>% 
  nest() %>% 
  rename(iat_trial = n,
         iat_data = data)

dataset_tidy <-
  read_rds("data/dataset_participant.RData") %>%
  select(-epoch,
         -timestamp) %>%
  mutate(is_duplicated = duplicated(jspsych_id)) %>%
  left_join(browser_event, by = "jspsych_id") %>%
#  full_join(connections, by = "jspsych_id") %>% 
  left_join(vaast, by = "jspsych_id") %>% 
  left_join(iat, by = "jspsych_id") 

write_rds(dataset_tidy, "data/dataset_tidy.RData")  

is_not_list <- 
  function(x) {
    !is.list(x)
  }

dataset_tidy %>% 
  select_if(is_not_list) %>%  
  write_rds("data/dataset_tidy_summary.RData")

