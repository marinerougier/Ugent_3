### Workspace -------------------------------------------------------------------
# To reset the workspace
rm(list=ls())

### Loading packages ------------------------------------------------------------
library(plyr)
library(dplyr)
library(gdata)
library(reshape)
library(car)
#library(tidyverse)
library(tidyr)
library(magrittr)
library(data.table)
library(ggplot2) # for the graphics
library(readr)
library(stringr)
library(psych)
library(GPArotation)
library(tidyverse)

# for the confidence intervals
ci.fun <- function (x) {
  
  moe<-qt(0.975, length(x)-1) * sd(x,na.rm=TRUE) / sqrt(length(x))
  
  LI <- mean(x,na.rm=TRUE) - moe
  HI <- mean(x,na.rm=TRUE) + moe
  Mean <- mean(x,na.rm=TRUE)
  
  CI<-cbind(LI,Mean,HI)
  colnames(CI)<-c("2.5%","Mean","97.5%")
  row.names(CI)<-deparse(substitute(x))
  CI
}

# Left Outter Join
LOT <- function(X = NULL, Y = NULL, onCol = NULL) {
  giveExemple <- is.null(X) & is.null(Y) & is.null(onCol)
  if (giveExemple) {
    cat("\nExemple:")
    cat("\n>X\n")
    X <- data.table(id = 1:5, L = letters[1:5]) %T>% print
    cat("\n>Y\n")
    Y <- data.table(id = 3:5, L = c(NA, "g", "h"), N = c(10, NA, 12)) %T>% print
    onCol <- "id"
    cat('\nLOT(X, Y, "id")\n')
  }
  
  n <- names(Y)
  X[Y, (n) := mget(paste0("i.", n)), on = onCol]
  
  if (giveExemple) {cat(">X\n"); print(X)}
}


# Ensure that relative paths start from the same directory as this script
rstudioapi::getActiveDocumentContext()$path %>% dirname %>% setwd

#-----------------------------------------------------------
#                     VAAST
#-----------------------------------------------------------

### Data files import and dataset formating -----------------------------------------------------------

load("data/data_VAAST.RData")
DF <- data.table(dataset_vaast_trial)

# Defining the "Subject", "Stimuli", "Movement" and "Valence" as factors.
DF$jspsych_id  <- factor(DF$jspsych_id)
DF$prolific_id <- factor(DF$prolific_id)
DF$Stimuli  <- factor(DF$stimulus)
DF$Movement <- factor(DF$movement)
DF$Group  <- factor(DF$group)

### Cleaning dataset and Data exclusion ------------------------------------------------------------

# We subset the training phases 
DF <- subset (DF, phase=="test")

# We keep only the approach/avoidance trial 
# (i.e., we remove trials coding for fixation and position 1) # 120 trials in total
DF <- subset (DF, position == 2)

# Incorrect trials

# Calculating the rate of incorrect trials per participant
DFACC <- data.frame (DF$correct, DF$jspsych_id)
DFACC <- aggregate (DFACC[, 1], list(DFACC$DF.jspsych_id), sum)
DFACC <- rename.vars (DFACC, c("Group.1","x"), c("jspsych_id","ACC_rate"))
arrange(DFACC,ACC_rate)

# Rate of participants having less than 60% of correct trials (here, XXX %, N = XXX)
# NB : we chose 60 % because under this limit, impossible to compute mean per condition
(nrow(DFACC[DFACC$ACC_rate <60, ]) / nrow(DFACC) )

# Subsetting participants 
DF <- merge (DF, DFACC, by.x.=c(jspsych_id), all=TRUE)
DF<- subset(DF, ACC_rate>60)

# Overall rate of incorrect trials (here, 4.57 % with the previous exclusion)
1 - (nrow(DF[DF$correct == TRUE, ]) / nrow(DF) )

# Subsetting incorrect trials.
DF <- DF[DF$correct == TRUE, ]


# RT Cutoff -------------------------------------------------------------------
# We define RT filters (minimum and maximum).

# NB : considering RT distribution, 450-2500 is the most reasonnable Cut-off
min <- 400   # 1.54 % of exclusion : seems to be the best cutoff
max <- 2000

# For other possible RT treatments, see below: 
#
#min <- 300   # 18.14% : too much exclusion
#max <- 1000

#min <- 350   # 4.04% of exclusion
#max <- 1500

#min <- 450   # 1.39 % of exclusion
#max <- 2500

#min <- 500   # 2.88 % of exclusion
#max <- 3000

# Rate of exclusion if we keep only the RTs above min and below max
1 - (nrow(DF[DF$rt > min & DF$rt < max, ]) / nrow(DF) )
# We subset RTs above min and below max
DF <- DF[DF$rt > min & DF$rt < max, ]

# DV transformation -----------------------------------------------------------
# Inverse transformation of RTs
DF$RTinv <- 1/DF$rt

# Logarithmic transformation of RTs
# DF$RTl <- log(DF$RT)

## Checking for the best filter according to the resulting distribution ----------------------------------------------------------- 
# NB : we choose the 450-2500 cutoff and the RTinv transformation 

# # With RT
# ggplot(DF,aes(RT)) +
#   geom_histogram(binwidth=100)
# 
# # With RTinv
# ggplot(DF,aes(RTinv)) +
#   geom_histogram(binwidth=.0001)
# 
# # With RTlog
# ggplot(DF,aes(RTl)) +
#   geom_histogram(binwidth=.050)


### Recoding factors ------------------------------------------------------------
DF <- 
  within(DF, 
         {
           # Compatibility score
           Compatibility <- ifelse((Group == "white" & Movement == "approach") | 
                                   (Group == "black" & Movement == "avoidance"),
                                   "Comp", "Incomp")
           # Control factors
           FirstBlock_C <- -0.5 * (firstblockvaast == "approach_black") + 0.5 * (firstblockvaast == "approach_white")
           TaskOrder_C <- -0.5 * (taskOrder == "VAAST_first") + 0.5 * (taskOrder == "IAT_first")
           
         })

# Creating mean/pp for compatible and incompatible blocks
# DF <- data.table(DF)
DF[, meanRTComp := mean(RTinv), .(jspsych_id, Compatibility)]

# Creating an average compatibility score
DF[, diff_VAAST := unique(meanRTComp[Compatibility == "Incomp"]) - unique(meanRTComp[Compatibility == "Comp"]), jspsych_id]


# Creating a new DF with only the useful info
DF_short <- DF[, .(diff_VAAST =  unique(diff_VAAST), 
                   taskOrder  =  unique(taskOrder),
                   firstblockvaast =  unique(firstblockvaast)), jspsych_id]

# Creating a standardized VAAST score per pp (check if it works with more pp !!!)
DF_short$diff_VAASTz <- scale(DF_short$diff_VAAST)


#-----------------------------------------------------------
#                     IAT
#-----------------------------------------------------------

### Data files import and dataset formating -----------------------------------------------------------

load("data/data_IAT.RData")
X <- data.table(dataset_iat_trial)

# Recommendations to compute the improved algorithm D score
# from Greenwald, Nosek, & Banaji (2003)

# 1) We keep all trials of Blocks 3, 4, 6, and 7 
X[iat_block == 5 & iat_type == "practice", iat_block := 6]
X[iat_block == 5 & iat_type == "test", iat_block := 7]
X[iat_block == 4, iat_block := 5]
X[iat_block == 3 & iat_type == "test", iat_block := 4]

# 2.1) Eliminate trials with latencies ???? 10,000 ms
X <- X[rt < 10000]

# 2.2) Eliminate subjects for whom more than 10% of trials have latency less than 300 ms
X[, rt300less10percent := mean(rt < 300), session_id]
X <- X[rt300less10percent < 0.10]

# 3) Compute mean of CORRECT latencies for each block
X[, meanRTblock := mean(rt[correct == TRUE]), .(jspsych_id, iat_block)]

# 4) Compute one pooled SD for all trials in B3 & B6; another for B4 & B7
X[, sdBlock3and6 := sd(rt[iat_block %in% c(3, 6)]), jspsych_id]
X[, sdBlock4and7 := sd(rt[iat_block %in% c(4, 7)]), jspsych_id]

# 5) Replace each error latency with block mean (computed in Step 3) + 600 ms
X[, rtt := ifelse(correct, rt, meanRTblock + 600)]

# 6) Average the resulting values for each of the four blocks
X[, meanRTcorrectBlock := mean(rtt), .(jspsych_id, iat_block)]

# 7) Compute two differences: B6-B3 and B7-B4
X[, diffMeanRTcorrectBlock6minus3 := unique(meanRTcorrectBlock[iat_block == 6]) - unique(meanRTcorrectBlock[iat_block == 3]), jspsych_id]
X[, diffMeanRTcorrectBlock7minus4 := unique(meanRTcorrectBlock[iat_block == 7]) - unique(meanRTcorrectBlock[iat_block == 4]), jspsych_id]

# 8) Divide each difference by its associated pooled-trials SD from Step 4
X[, Dscore6and3 := diffMeanRTcorrectBlock6minus3 / sdBlock3and6, jspsych_id]
X[, Dscore4and7 := diffMeanRTcorrectBlock7minus4 / sdBlock4and7, jspsych_id]

# 9) Average the two quotients from Step 8
X[, Dscore := mean(c(Dscore6and3, Dscore4and7)), jspsych_id]

# Creating a block order variables 
X <- 
  within(X, 
         {BlockOrder <- ifelse((iat_label_left == "GOOD-WHITE people" & iat_block == 3) | 
                               (iat_label_right == "GOOD-WHITE people" & iat_block == 3),
                                   "CompFirst", "IncompFirst")})

# Inversing the D score as function of this block order ### pas sure de ??a !!!
X[BlockOrder == "IncompFirst", Dscore := -Dscore]

# Creating a new DF with only the useful info
D <- X[, .(Dscore = unique(Dscore), 
           taskOrder= unique(taskOrder),
           BlockOrder= unique(BlockOrder)), jspsych_id]

# Creating a standardized VAAST score per pp (check if it works with more pp !!!)
D$Dscorez <- scale(D$Dscore)

#-----------------------------------------------------------
#                     Qualtrics
#-----------------------------------------------------------

# Qualtrics (demo info) --> we use the file registered as csv sep ; AND WE CHANGE "-" signs 
# with "_" signs (because otherwise R thinks it is a minus sign)
# where we removed raw 2:53
Qual <- fread("Data/Qualtrics_data.csv")[, c(18:86)]



Qual <- within(Qual,{
  # Trust Black
  TrustB<-rowMeans(cbind(BF_011_2, BF_012_2, BF_014_2, BF_015_2, BF_024_2,
                         BF_029_2, BF_034_2, BF_035_2, BF_220_2, BF_246_2,
                         BM_001_2, BM_025_2, BM_038_2, BM_212_2, BM_223_2,
                         BM_232_2, BM_235_2, BM_237_2, BM_248_2, BM_253_2),na.rm=TRUE)
  # Trust White
  TrustW<-rowMeans(cbind(WF_002_2, WF_019_2, WF_201_2, WF_204_2, WF_213_2,
                         WF_218_2, WF_224_2, WF_225_2, WF_226_2, WF_229_2,
                         WM_013_2, WM_016_2, WM_026_2, WM_205_2, WM_215_2,
                         WM_216_2, WM_223_2, WM_227_2, WM_238_2, WM_241_2),na.rm=TRUE)
  
  TrustScore <- TrustW - TrustB
})

# We rename the id variable 
Qual$session_id <- Qual$id

# Creating a new DF with only the useful info
Qual_short <- Qual[, .(TrustScore, 
                       TrustW,
                       TrustB, 
                       gender, 
                       age, 
                       Handedness, 
                       English,
                       VAAST_Before,
                       IAT_before), session_id]


#-----------------------------------------------------------
#                     Merged data
#-----------------------------------------------------------

# Merge data
LOT(D, DF_short, "session_id")
LOT(D, Qual_short, "session_id")


### Mixed-modeling --------------------------------------------------------------

# Loading the lmerTest package now (to avoid conflit with the dplyr package used before)
library(lmerTest)

# Y = b0 + b1X + b2Z
# Y = b0 + b1X + b2Z (- b2X + b2X)
# Y = b0 + (b1 - b2)X + (Z + X)b2

# Movement * Group interaction ------------------------------------------------------
fitA.lmer <-
  lmer(TrustScore ~ Dscorez + diff_VAASTz + 
                    (Dscorez + diff_VAASTz | session_id) + 
                    (Dscorez + diff_VAASTz | Stimuli),
                     data = D)

summary(fitA.lmer)






# Demographic informations ----------------------------------------------------
# Data wrangling --------------------------------------------------------------
DF_demo <- cast(DF, 
                pp + age + gender + hand ~ Movement,
                value = "RT",
                mean,
                fill = NA)

# Age -------------------------------------------------------------------------
mean(DF_demo$age) # 39.58 years
sd(DF_demo$age) # 12.11

# Gender ----------------------------------------------------------------------
# (1 = male)
table(DF_demo$gender) # 114 males and 188 females

# Handedness ----------------------------------------------------------------------
# (1 = left-handed)
table(DF_demo$hand) # 50 left-handed and 252 right-handed

